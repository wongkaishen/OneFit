-- 0012: Supabase Storage buckets for OneFit uploads.
--
-- Two buckets:
--   onefit-public      public read  -> progress photos, educational media
--   onefit-credentials private      -> specialist certification docs (admin-viewed)
--
-- The FastAPI backend uses the service-role key and bypasses storage RLS; these
-- policies are defense-in-depth for direct anon/authenticated access. Idempotent.

insert into storage.buckets (id, name, public)
values ('onefit-public', 'onefit-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('onefit-credentials', 'onefit-credentials', false)
on conflict (id) do nothing;

-- Public bucket: anyone may read; only the service role writes (default-deny on
-- insert/update/delete for anon+authenticated since no permissive policy grants it).
drop policy if exists "onefit-public read" on storage.objects;
create policy "onefit-public read" on storage.objects for select
    using (bucket_id = 'onefit-public');

-- Credentials bucket: no anon/authenticated select policy => only the service
-- role (which bypasses RLS) can read or write. Nothing to create here.
