-- 0016: community social feed + reporting (issue #3, Phase 1).
--
-- Turns community_posts into the backing store for a global social feed:
--   * group_id becomes nullable — a NULL group_id is a global feed post
--     (vs. a post inside a specialist-owned community group).
--   * image_url carries an optional attached photo (Supabase Storage public URL).
-- Adds public.reports: a member reports a post/message/user; admins triage and
-- can dismiss, remove the post, or suspend the offending user.

-- --- community_posts: allow global feed posts + an attached image ------------
alter table public.community_posts alter column group_id drop not null;
alter table public.community_posts add column if not exists image_url text;
create index if not exists community_posts_feed_idx
    on public.community_posts (created_at)
    where group_id is null;

-- --- reports ----------------------------------------------------------------
create table if not exists public.reports (
    report_id   uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references public.profiles (id) on delete cascade,
    target_type text not null check (target_type in ('post', 'message', 'user')),
    target_id   uuid not null,
    reason      text,
    status      text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
    reviewed_by uuid references public.profiles (id) on delete set null,
    reviewed_at timestamptz,
    created_at  timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at);
create index if not exists reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;
-- Defense-in-depth: a reporter may file and see their own reports; admin triage
-- runs through the service role (which bypasses RLS).
create policy "reports - reporter inserts" on public.reports for insert
    with check (reporter_id = auth.uid());
create policy "reports - reporter reads own" on public.reports for select
    using (reporter_id = auth.uid());
