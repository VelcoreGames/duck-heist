-- Velcore Games cloud identity + per-game cloud saves
-- Designed for static clients using the public Supabase anon key.
-- Passwords and recovery codes are never stored in plaintext.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.vg_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_norm text not null unique,
  password_hash text not null,
  recovery_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.vg_sessions (
  token_hash text primary key,
  user_id uuid not null references public.vg_users(id) on delete cascade,
  device_id text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists vg_sessions_user_idx on public.vg_sessions(user_id);
create index if not exists vg_sessions_expiry_idx on public.vg_sessions(expires_at);

create table if not exists public.vg_game_saves (
  user_id uuid not null references public.vg_users(id) on delete cascade,
  game_slug text not null,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null,
  device_id text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, game_slug)
);

alter table public.vg_users enable row level security;
alter table public.vg_sessions enable row level security;
alter table public.vg_game_saves enable row level security;

revoke all on public.vg_users from anon, authenticated;
revoke all on public.vg_sessions from anon, authenticated;
revoke all on public.vg_game_saves from anon, authenticated;

create or replace function public.vg_private_user_for_session(p_session_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_user uuid;
begin
  if p_session_token is null or length(p_session_token) < 32 then return null; end if;
  v_hash := encode(digest(p_session_token, 'sha256'), 'hex');
  select user_id into v_user
  from public.vg_sessions
  where token_hash=v_hash and expires_at>now();
  if v_user is not null then
    update public.vg_sessions
      set last_seen_at=now(), expires_at=greatest(expires_at,now()+interval '30 days')
      where token_hash=v_hash;
  end if;
  return v_user;
end;
$$;

revoke all on function public.vg_private_user_for_session(text) from public, anon, authenticated;

create or replace function public.vg_create_account(p_username text,p_password text,p_device_id text default '')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text:=trim(coalesce(p_username,''));
  v_norm text:=lower(trim(coalesce(p_username,'')));
  v_user uuid;
  v_token text;
  v_token_hash text;
  v_recovery_raw text;
  v_recovery text;
  v_expires timestamptz:=now()+interval '30 days';
begin
  delete from public.vg_sessions where expires_at<=now();

  if v_username !~ '^[A-Za-z0-9_]{3,20}$' then
    return jsonb_build_object('ok',false,'code','invalid_username');
  end if;
  if v_norm = any(array['admin','administrator','mod','moderator','soporte','support','velcore','velcoregames','duckheist']) then
    return jsonb_build_object('ok',false,'code','reserved_username');
  end if;
  if length(coalesce(p_password,''))<10 or length(p_password)>128 then
    return jsonb_build_object('ok',false,'code','weak_password');
  end if;

  v_recovery_raw:=upper(encode(gen_random_bytes(8),'hex'));
  v_recovery:='DH-'||substr(v_recovery_raw,1,4)||'-'||substr(v_recovery_raw,5,4)||'-'||substr(v_recovery_raw,9,4)||'-'||substr(v_recovery_raw,13,4);

  begin
    insert into public.vg_users(username,username_norm,password_hash,recovery_hash)
    values(v_username,v_norm,crypt(p_password,gen_salt('bf',12)),encode(digest(v_recovery,'sha256'),'hex'))
    returning id into v_user;
  exception when unique_violation then
    return jsonb_build_object('ok',false,'code','username_taken');
  end;

  v_token:=encode(gen_random_bytes(32),'hex');
  v_token_hash:=encode(digest(v_token,'sha256'),'hex');
  insert into public.vg_sessions(token_hash,user_id,device_id,expires_at)
  values(v_token_hash,v_user,left(coalesce(p_device_id,''),100),v_expires);

  return jsonb_build_object(
    'ok',true,'code','created','user_id',v_user,'username',v_username,
    'session_token',v_token,'expires_at',v_expires,'recovery_code',v_recovery
  );
end;
$$;

create or replace function public.vg_login(p_username text,p_password text,p_device_id text default '')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.vg_users%rowtype;
  v_token text;
  v_expires timestamptz:=now()+interval '30 days';
begin
  delete from public.vg_sessions where expires_at<=now();

  select * into u from public.vg_users
  where username_norm=lower(trim(coalesce(p_username,''))) for update;

  if not found then
    perform pg_sleep(.18);
    return jsonb_build_object('ok',false,'code','invalid_credentials');
  end if;
  if u.locked_until is not null and u.locked_until>now() then
    return jsonb_build_object('ok',false,'code','locked');
  end if;

  if u.password_hash <> crypt(coalesce(p_password,''),u.password_hash) then
    update public.vg_users
      set failed_attempts=case when failed_attempts>=7 then 0 else failed_attempts+1 end,
          locked_until=case when failed_attempts>=7 then now()+interval '15 minutes' else null end
      where id=u.id;
    perform pg_sleep(.18);
    return jsonb_build_object('ok',false,'code','invalid_credentials');
  end if;

  update public.vg_users set failed_attempts=0,locked_until=null,last_login_at=now() where id=u.id;
  v_token:=encode(gen_random_bytes(32),'hex');
  insert into public.vg_sessions(token_hash,user_id,device_id,expires_at)
  values(encode(digest(v_token,'sha256'),'hex'),u.id,left(coalesce(p_device_id,''),100),v_expires);

  return jsonb_build_object('ok',true,'code','ok','user_id',u.id,'username',u.username,'session_token',v_token,'expires_at',v_expires);
end;
$$;

create or replace function public.vg_validate_session(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
  u public.vg_users%rowtype;
  v_exp timestamptz;
begin
  v_user:=public.vg_private_user_for_session(p_session_token);
  if v_user is null then return jsonb_build_object('ok',false,'code','invalid_session'); end if;
  select * into u from public.vg_users where id=v_user;
  select expires_at into v_exp from public.vg_sessions where token_hash=encode(digest(p_session_token,'sha256'),'hex');
  return jsonb_build_object('ok',true,'code','ok','user_id',u.id,'username',u.username,'expires_at',v_exp);
end;
$$;

create or replace function public.vg_logout(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.vg_sessions where token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex');
  return jsonb_build_object('ok',true,'code','ok');
end;
$$;

create or replace function public.vg_recover_account(p_username text,p_recovery_code text,p_new_password text,p_device_id text default '')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.vg_users%rowtype;
  v_token text;
  v_expires timestamptz:=now()+interval '30 days';
  v_raw text;
  v_recovery text;
begin
  if length(coalesce(p_new_password,''))<10 or length(p_new_password)>128 then
    return jsonb_build_object('ok',false,'code','weak_password');
  end if;
  select * into u from public.vg_users where username_norm=lower(trim(coalesce(p_username,''))) for update;
  if not found or u.recovery_hash<>encode(digest(upper(trim(coalesce(p_recovery_code,''))),'sha256'),'hex') then
    perform pg_sleep(.18);
    return jsonb_build_object('ok',false,'code','invalid_recovery');
  end if;

  v_raw:=upper(encode(gen_random_bytes(8),'hex'));
  v_recovery:='DH-'||substr(v_raw,1,4)||'-'||substr(v_raw,5,4)||'-'||substr(v_raw,9,4)||'-'||substr(v_raw,13,4);
  update public.vg_users
    set password_hash=crypt(p_new_password,gen_salt('bf',12)),
        recovery_hash=encode(digest(v_recovery,'sha256'),'hex'),
        failed_attempts=0,locked_until=null,last_login_at=now()
    where id=u.id;
  delete from public.vg_sessions where user_id=u.id;

  v_token:=encode(gen_random_bytes(32),'hex');
  insert into public.vg_sessions(token_hash,user_id,device_id,expires_at)
  values(encode(digest(v_token,'sha256'),'hex'),u.id,left(coalesce(p_device_id,''),100),v_expires);

  return jsonb_build_object(
    'ok',true,'code','recovered','user_id',u.id,'username',u.username,
    'session_token',v_token,'expires_at',v_expires,'recovery_code',v_recovery
  );
end;
$$;

create or replace function public.vg_load_game_save(p_session_token text,p_game_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
  s public.vg_game_saves%rowtype;
begin
  v_user:=public.vg_private_user_for_session(p_session_token);
  if v_user is null then return jsonb_build_object('ok',false,'code','invalid_session'); end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z0-9][a-z0-9-]{1,39}$' then
    return jsonb_build_object('ok',false,'code','invalid_game');
  end if;
  select * into s from public.vg_game_saves where user_id=v_user and game_slug=p_game_slug;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'code','ok','revision',s.revision,'payload',s.payload,'updated_at',s.updated_at);
end;
$$;

create or replace function public.vg_save_game_save(
  p_session_token text,
  p_game_slug text,
  p_expected_revision bigint,
  p_payload jsonb,
  p_device_id text default '',
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
  s public.vg_game_saves%rowtype;
  v_revision bigint;
  v_updated timestamptz;
begin
  v_user:=public.vg_private_user_for_session(p_session_token);
  if v_user is null then return jsonb_build_object('ok',false,'code','invalid_session'); end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z0-9][a-z0-9-]{1,39}$' then
    return jsonb_build_object('ok',false,'code','invalid_game');
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    return jsonb_build_object('ok',false,'code','invalid_payload');
  end if;
  if octet_length(p_payload::text)>524288 then
    return jsonb_build_object('ok',false,'code','payload_too_large');
  end if;

  select * into s from public.vg_game_saves
  where user_id=v_user and game_slug=p_game_slug for update;

  if not found then
    if coalesce(p_expected_revision,0)<>0 and not p_force then
      return jsonb_build_object('ok',false,'code','conflict','revision',0);
    end if;
    begin
      insert into public.vg_game_saves(user_id,game_slug,revision,payload,device_id)
      values(v_user,p_game_slug,1,p_payload,left(coalesce(p_device_id,''),100))
      returning revision,updated_at into v_revision,v_updated;
      return jsonb_build_object('ok',true,'code','saved','revision',v_revision,'updated_at',v_updated);
    exception when unique_violation then
      select * into s from public.vg_game_saves where user_id=v_user and game_slug=p_game_slug for update;
    end;
  end if;

  if not p_force and s.revision<>coalesce(p_expected_revision,0) then
    return jsonb_build_object('ok',false,'code','conflict','revision',s.revision,'payload',s.payload,'updated_at',s.updated_at);
  end if;

  update public.vg_game_saves
  set revision=s.revision+1,payload=p_payload,device_id=left(coalesce(p_device_id,''),100),updated_at=now()
  where user_id=v_user and game_slug=p_game_slug
  returning revision,updated_at into v_revision,v_updated;

  return jsonb_build_object('ok',true,'code','saved','revision',v_revision,'updated_at',v_updated);
end;
$$;

grant execute on function public.vg_create_account(text,text,text) to anon, authenticated;
grant execute on function public.vg_login(text,text,text) to anon, authenticated;
grant execute on function public.vg_validate_session(text) to anon, authenticated;
grant execute on function public.vg_logout(text) to anon, authenticated;
grant execute on function public.vg_recover_account(text,text,text,text) to anon, authenticated;
grant execute on function public.vg_load_game_save(text,text) to anon, authenticated;
grant execute on function public.vg_save_game_save(text,text,bigint,jsonb,text,boolean) to anon, authenticated;

comment on table public.vg_users is 'Velcore Games identities. Passwords and recovery codes are stored only as hashes.';
comment on table public.vg_game_saves is 'Versioned per-user, per-game cloud saves with optimistic conflict detection.';
