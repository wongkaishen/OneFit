-- 0008: new accounts are active on sign-up (no admin approval gate).
--
-- profiles.status previously defaulted to 'pending' and handle_new_user never
-- set it, so a freshly registered user was bounced by the frontend AuthGate until
-- an admin flipped their status. Supabase Auth already authenticates the user;
-- role-based access (require_role) still governs what each role can see. 'suspended'
-- remains meaningful for admin moderation (now enforced server-side too).

-- 1) Default new rows to active.
alter table public.profiles alter column status set default 'active';

-- 2) The auth trigger must insert status = 'active' explicitly (it sets columns
--    by name, so the new default alone is not enough).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, name, role, status)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data ->> 'name',
        coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'gym_user'),
        'active'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- 3) Backfill: activate everyone still stuck in 'pending' (admins are seeded
--    directly and are unaffected; suspended users stay suspended).
update public.profiles set status = 'active' where status = 'pending';
