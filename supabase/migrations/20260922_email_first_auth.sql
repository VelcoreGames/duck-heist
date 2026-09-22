-- Supabase Auth email-first accounts for Velcore Games.
-- Flow: verify email -> choose unique username -> cloud progress.
-- Replaces the temporary custom password/session tables. No production users existed at migration time.

begin;

drop function if exists public.vg_create_account(text,text,text);
drop function if exists public.vg_login(text,text,text);
drop function if exists public.vg_validate_session(text);
drop function if exists public.vg_logout(text);
drop function if exists public.vg_recover_account(text,text,text,text);
drop function if exists public.vg_load_game_save(text,text);
drop function if exists public.vg_save_game_save(text,text,bigint,jsonb,text,boolean);

drop function if exists private.vg_create_account(text,text,text);
drop function if exists private.vg_login(text,text,text);
drop function if exists private.vg_validate_session(text);
drop function if exists private.vg_logout(text);
drop function if exists private.vg_recover_account(text,text,text,text);
drop function if exists private.vg_load_game_save(text,text);
drop function if exists private.vg_save_game_save(text,text,bigint,jsonb,text,boolean);

drop table if exists public.vg_game_saves cascade;
drop table if exists public.vg_sessions cascade;
drop table if exists public.vg_users cascade;

create table public.vg_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_norm text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vg_profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

create table public.vg_game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null,
  device_id text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id,game_slug),
  constraint vg_game_slug_format check (game_slug ~ '^[a-z0-9][a-z0-9-]{1,39}$')
);

alter table public.vg_profiles enable row level security;
alter table public.vg_game_saves enable row level security;

revoke all on public.vg_profiles from anon,authenticated;
revoke all on public.vg_game_saves from anon,authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.vg_get_profile()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  p public.vg_profiles%rowtype;
begin
  if v_user is null then return jsonb_build_object('ok',false,'code','invalid_session'); end if;
  select * into p from public.vg_profiles where user_id=v_user;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'code','ok','username',p.username);
end;
$$;

create or replace function private.vg_claim_username(p_username text)
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
  if v_norm = any(array['admin','administrator','mod','moderator','soporte','support','velcore','velcoregames','duckheist']) then
    return jsonb_build_object('ok',false,'code','reserved_username');
  end if;

  select username into v_existing from public.vg_profiles where user_id=v_user;
  if found then return jsonb_build_object('ok',true,'code','profile_exists','username',v_existing); end if;

  begin
    insert into public.vg_profiles(user_id,username,username_norm) values(v_user,v_username,v_norm);
  exception when unique_violation then
    for v_suffix in 2..999 loop
      v_candidate:=left(v_username,20-length(v_suffix::text))||v_suffix::text;
      if not exists(select 1 from public.vg_profiles where username_norm=lower(v_candidate)) then
        v_suggestions:=v_suggestions||jsonb_build_array(v_candidate);
        if jsonb_array_length(v_suggestions)>=3 then exit; end if;
      end if;
    end loop;
    return jsonb_build_object('ok',false,'code','username_taken','suggestions',v_suggestions);
  end;

  return jsonb_build_object('ok',true,'code','created','username',v_username);
end;
$$;

create or replace function private.vg_load_game_save(p_game_slug text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  s public.vg_game_saves%rowtype;
begin
  if v_user is null then return jsonb_build_object('ok',false,'code','invalid_session'); end if;
  if not exists(select 1 from public.vg_profiles where user_id=v_user) then
    return jsonb_build_object('ok',false,'code','profile_required');
  end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z0-9][a-z0-9-]{1,39}$' then
    return jsonb_build_object('ok',false,'code','invalid_game');
  end if;
  select * into s from public.vg_game_saves where user_id=v_user and game_slug=p_game_slug;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'code','ok','revision',s.revision,'payload',s.payload,'updated_at',s.updated_at);
end;
$$;

create or replace function private.vg_save_game_save(
  p_game_slug text,
  p_expected_revision bigint,
  p_payload jsonb,
  p_device_id text default '',
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  s public.vg_game_saves%rowtype;
  v_revision bigint;
  v_updated timestamptz;
begin
  if v_user is null then return jsonb_build_object('ok',false,'code','invalid_session'); end if;
  if not exists(select 1 from public.vg_profiles where user_id=v_user) then
    return jsonb_build_object('ok',false,'code','profile_required');
  end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z0-9][a-z0-9-]{1,39}$' then
    return jsonb_build_object('ok',false,'code','invalid_game');
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    return jsonb_build_object('ok',false,'code','invalid_payload');
  end if;
  if octet_length(p_payload::text)>524288 then
    return jsonb_build_object('ok',false,'code','payload_too_large');
  end if;

  select * into s from public.vg_game_saves where user_id=v_user and game_slug=p_game_slug for update;

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

revoke all on function private.vg_get_profile() from public;
revoke all on function private.vg_claim_username(text) from public;
revoke all on function private.vg_load_game_save(text) from public;
revoke all on function private.vg_save_game_save(text,bigint,jsonb,text,boolean) from public;

grant execute on function private.vg_get_profile() to authenticated;
grant execute on function private.vg_claim_username(text) to authenticated;
grant execute on function private.vg_load_game_save(text) to authenticated;
grant execute on function private.vg_save_game_save(text,bigint,jsonb,text,boolean) to authenticated;

create or replace function public.vg_get_profile()
returns jsonb language sql security invoker set search_path='' as $$ select private.vg_get_profile() $$;
create or replace function public.vg_claim_username(p_username text)
returns jsonb language sql security invoker set search_path='' as $$ select private.vg_claim_username(p_username) $$;
create or replace function public.vg_load_game_save(p_game_slug text)
returns jsonb language sql security invoker set search_path='' as $$ select private.vg_load_game_save(p_game_slug) $$;
create or replace function public.vg_save_game_save(
  p_game_slug text,p_expected_revision bigint,p_payload jsonb,p_device_id text default '',p_force boolean default false
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_save_game_save(p_game_slug,p_expected_revision,p_payload,p_device_id,p_force)
$$;

revoke execute on function public.vg_get_profile() from public,anon;
revoke execute on function public.vg_claim_username(text) from public,anon;
revoke execute on function public.vg_load_game_save(text) from public,anon;
revoke execute on function public.vg_save_game_save(text,bigint,jsonb,text,boolean) from public,anon;

grant execute on function public.vg_get_profile() to authenticated;
grant execute on function public.vg_claim_username(text) to authenticated;
grant execute on function public.vg_load_game_save(text) to authenticated;
grant execute on function public.vg_save_game_save(text,bigint,jsonb,text,boolean) to authenticated;

comment on table public.vg_profiles is 'Verified Supabase Auth users and their unique visible Velcore Games username.';
comment on table public.vg_game_saves is 'Versioned per-user per-game cloud saves linked to Supabase Auth identities.';

commit;
