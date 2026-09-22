-- Remove the temporary pre-email Velcore Games account backend.
-- Apply only after the email-first frontend is live in production.

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

commit;
