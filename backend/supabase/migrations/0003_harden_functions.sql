-- Harden SECURITY DEFINER functions flagged by the security advisor
-- (lints 0028 / 0029: SECURITY DEFINER functions executable via REST RPC).

-- current_user_role() is an unused helper -> drop it.
drop function if exists public.current_user_role();

-- handle_new_user() is only ever invoked by the on_auth_user_created trigger.
-- Remove it from the public REST API surface so it can't be called via RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
