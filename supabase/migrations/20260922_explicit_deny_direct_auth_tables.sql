-- Explicitly deny all direct Data API access to account tables.
-- Cloud account operations are exposed only through the authenticated RPC boundary.

create policy "deny direct profile access"
on public.vg_auth_profiles
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny direct game save access"
on public.vg_auth_game_saves
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
