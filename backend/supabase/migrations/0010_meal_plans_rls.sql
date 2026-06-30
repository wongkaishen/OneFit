-- 0010: enable RLS on public.meal_plans (was the only table with RLS disabled).
--
-- The FastAPI backend uses the service-role key and bypasses RLS, so these
-- policies do not affect server-mediated access; they close the hole where the
-- anon/authenticated keys could read or modify every meal plan directly. The
-- shape mirrors the defense-in-depth policies in 0002_rls.sql.

alter table public.meal_plans enable row level security;

-- The authoring specialist manages their own plans (any status).
create policy "meal_plans - specialist manages" on public.meal_plans for all
    using (specialist_id = auth.uid()) with check (specialist_id = auth.uid());
-- The targeted gym user reads plans published to them.
create policy "meal_plans - client reads" on public.meal_plans for select
    using (client_id = auth.uid());
