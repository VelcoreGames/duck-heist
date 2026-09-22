import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type LoginBody = { username?: string; password?: string };

const json = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Headers": "content-type, apikey",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });

const allowedOrigin = (origin: string) => {
  if (origin === "https://velcoregames.com") return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "";
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") return json({}, 204, origin);
  if (req.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405, origin);

  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ ok: false, code: "server_not_configured" }, 500, origin);
  }

  if (req.headers.get("apikey") !== publishableKey) {
    return json({ ok: false, code: "invalid_client" }, 401, origin);
  }

  let body: LoginBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "invalid_request" }, 400, origin);
  }

  const username = String(body.username || "").trim();
  const usernameNorm = username.toLowerCase();
  const password = String(body.password || "");

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username) || password.length < 10 || password.length > 128) {
    await sleep(250);
    return json({ ok: false, code: "invalid_credentials" }, 400, origin);
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const clientIp = forwarded || req.headers.get("cf-connecting-ip") || "unknown";
  const limitKey = await sha256(usernameNorm + "|" + clientIp);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = Date.now();
  const { data: limit } = await admin
    .from("vg_auth_login_limits")
    .select("attempts,window_start,blocked_until")
    .eq("key_hash", limitKey)
    .maybeSingle();

  if (limit?.blocked_until && new Date(limit.blocked_until).getTime() > now) {
    return json({ ok: false, code: "too_many_attempts" }, 429, origin);
  }

  const recordFailure = async () => {
    const windowStart = limit?.window_start ? new Date(limit.window_start).getTime() : 0;
    const withinWindow = now - windowStart < 15 * 60 * 1000;
    const attempts = withinWindow ? Number(limit?.attempts || 0) + 1 : 1;
    const blockedUntil = attempts >= 8 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
    await admin.from("vg_auth_login_limits").upsert({
      key_hash: limitKey,
      attempts: blockedUntil ? 0 : attempts,
      window_start: withinWindow && limit?.window_start ? limit.window_start : new Date(now).toISOString(),
      blocked_until: blockedUntil,
      updated_at: new Date(now).toISOString(),
    });
  };

  const { data: profile } = await admin
    .from("vg_auth_profiles")
    .select("user_id,username")
    .eq("username_norm", usernameNorm)
    .maybeSingle();

  if (!profile?.user_id) {
    await recordFailure();
    await sleep(250);
    return json({ ok: false, code: "invalid_credentials" }, 400, origin);
  }

  const { data: userResult } = await admin.auth.admin.getUserById(profile.user_id);
  const email = userResult?.user?.email || "";
  const confirmed = !!userResult?.user?.email_confirmed_at;

  if (!email || !confirmed) {
    await recordFailure();
    await sleep(250);
    return json({ ok: false, code: "invalid_credentials" }, 400, origin);
  }

  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });

  if (signInError || !signedIn.session || !signedIn.user) {
    await recordFailure();
    await sleep(250);
    return json({ ok: false, code: "invalid_credentials" }, 400, origin);
  }

  await admin.from("vg_auth_login_limits").delete().eq("key_hash", limitKey);

  return json({
    ok: true,
    code: "ok",
    username: profile.username,
    access_token: signedIn.session.access_token,
    refresh_token: signedIn.session.refresh_token,
    expires_in: signedIn.session.expires_in,
    expires_at: signedIn.session.expires_at,
    token_type: signedIn.session.token_type,
    user: {
      id: signedIn.user.id,
      email: signedIn.user.email,
      email_confirmed_at: signedIn.user.email_confirmed_at,
      confirmed_at: signedIn.user.confirmed_at,
    },
  }, 200, origin);
});
