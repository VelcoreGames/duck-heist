-- Move privileged account functions out of the exposed public schema.
-- Public RPC names remain stable through SECURITY INVOKER wrappers.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.vg_create_account(text,text,text) set schema private;
alter function public.vg_login(text,text,text) set schema private;
alter function public.vg_validate_session(text) set schema private;
alter function public.vg_logout(text) set schema private;
alter function public.vg_recover_account(text,text,text,text) set schema private;
alter function public.vg_load_game_save(text,text) set schema private;
alter function public.vg_save_game_save(text,text,bigint,jsonb,text,boolean) set schema private;

revoke all on function private.vg_create_account(text,text,text) from public;
revoke all on function private.vg_login(text,text,text) from public;
revoke all on function private.vg_validate_session(text) from public;
revoke all on function private.vg_logout(text) from public;
revoke all on function private.vg_recover_account(text,text,text,text) from public;
revoke all on function private.vg_load_game_save(text,text) from public;
revoke all on function private.vg_save_game_save(text,text,bigint,jsonb,text,boolean) from public;

grant execute on function private.vg_create_account(text,text,text) to anon, authenticated;
grant execute on function private.vg_login(text,text,text) to anon, authenticated;
grant execute on function private.vg_validate_session(text) to anon, authenticated;
grant execute on function private.vg_logout(text) to anon, authenticated;
grant execute on function private.vg_recover_account(text,text,text,text) to anon, authenticated;
grant execute on function private.vg_load_game_save(text,text) to anon, authenticated;
grant execute on function private.vg_save_game_save(text,text,bigint,jsonb,text,boolean) to anon, authenticated;

create or replace function public.vg_create_account(p_username text,p_password text,p_device_id text default '')
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_create_account(p_username,p_password,p_device_id)
$$;
create or replace function public.vg_login(p_username text,p_password text,p_device_id text default '')
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_login(p_username,p_password,p_device_id)
$$;
create or replace function public.vg_validate_session(p_session_token text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_validate_session(p_session_token)
$$;
create or replace function public.vg_logout(p_session_token text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_logout(p_session_token)
$$;
create or replace function public.vg_recover_account(p_username text,p_recovery_code text,p_new_password text,p_device_id text default '')
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_recover_account(p_username,p_recovery_code,p_new_password,p_device_id)
$$;
create or replace function public.vg_load_game_save(p_session_token text,p_game_slug text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_load_game_save(p_session_token,p_game_slug)
$$;
create or replace function public.vg_save_game_save(
  p_session_token text,p_game_slug text,p_expected_revision bigint,p_payload jsonb,p_device_id text default '',p_force boolean default false
)
returns jsonb language sql security invoker set search_path='' as $$
  select private.vg_save_game_save(p_session_token,p_game_slug,p_expected_revision,p_payload,p_device_id,p_force)
$$;

revoke execute on function public.vg_create_account(text,text,text) from public;
revoke execute on function public.vg_login(text,text,text) from public;
revoke execute on function public.vg_validate_session(text) from public;
revoke execute on function public.vg_logout(text) from public;
revoke execute on function public.vg_recover_account(text,text,text,text) from public;
revoke execute on function public.vg_load_game_save(text,text) from public;
revoke execute on function public.vg_save_game_save(text,text,bigint,jsonb,text,boolean) from public;

grant execute on function public.vg_create_account(text,text,text) to anon, authenticated;
grant execute on function public.vg_login(text,text,text) to anon, authenticated;
grant execute on function public.vg_validate_session(text) to anon, authenticated;
grant execute on function public.vg_logout(text) to anon, authenticated;
grant execute on function public.vg_recover_account(text,text,text,text) to anon, authenticated;
grant execute on function public.vg_load_game_save(text,text) to anon, authenticated;
grant execute on function public.vg_save_game_save(text,text,bigint,jsonb,text,boolean) to anon, authenticated;
