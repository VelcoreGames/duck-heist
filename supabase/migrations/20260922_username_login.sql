-- Username login support for Velcore Games.
-- Usernames remain case-insensitive through username_norm.
-- "Admin" is intentionally allowed; official/support identities remain reserved.

begin;

create table if not exists public.vg_auth_login_limits (
  key_hash text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  window_start timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.vg_auth_login_limits enable row level security;
revoke all on public.vg_auth_login_limits from public, anon, authenticated;

drop policy if exists "deny direct login limit access" on public.vg_auth_login_limits;
create policy "deny direct login limit access"
on public.vg_auth_login_limits
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create or replace function private.vg_auth_claim_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_username text:=trim(coalesce(p_username,''));
  v_norm text:=lower(trim(coalesce(p_username,'')));
  v_verified boolean:=false;
  v_existing text;
  v_suggestions jsonb:='[]'::jsonb;
  v_candidate text;
  v_suffix integer;
begin
  if v_user is null then return jsonb_build_object('ok',false,'code','invalid_session'); end if;
  select email_confirmed_at is not null into v_verified from auth.users where id=v_user;
  if not coalesce(v_verified,false) then return jsonb_build_object('ok',false,'code','email_not_verified'); end if;

  if v_username !~ '^[A-Za-z0-9_]{3,20}$' then return jsonb_build_object('ok',false,'code','invalid_username'); end if;
  if v_norm = any(array['administrator','mod','moderator','soporte','support','velcore','velcoregames','duckheist']) then
    return jsonb_build_object('ok',false,'code','reserved_username');
  end if;

  select username into v_existing from public.vg_auth_profiles where user_id=v_user;
  if found then return jsonb_build_object('ok',true,'code','profile_exists','username',v_existing); end if;

  begin
    insert into public.vg_auth_profiles(user_id,username,username_norm)
    values(v_user,v_username,v_norm);
  exception when unique_violation then
    for v_suffix in 2..999 loop
      v_candidate:=left(v_username,20-length(v_suffix::text))||v_suffix::text;
      if not exists(select 1 from public.vg_auth_profiles where username_norm=lower(v_candidate)) then
        v_suggestions:=v_suggestions||jsonb_build_array(v_candidate);
        if jsonb_array_length(v_suggestions)>=3 then exit; end if;
      end if;
    end loop;
    return jsonb_build_object('ok',false,'code','username_taken','suggestions',v_suggestions);
  end;

  return jsonb_build_object('ok',true,'code','created','username',v_username);
end;
$$;

commit;
