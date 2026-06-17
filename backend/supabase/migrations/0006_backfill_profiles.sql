-- 0006: backfill profiles for any auth.users created before the
-- on_auth_user_created trigger existed (or for which it failed to fire).
-- The backend resolves role/status from public.profiles, so a missing row makes
-- every authenticated request 403 "No profile for this user". Idempotent.

insert into public.profiles (id, email, name, role)
select
    u.id,
    u.email,
    u.raw_user_meta_data ->> 'name',
    coalesce((u.raw_user_meta_data ->> 'role')::user_role, 'gym_user')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
