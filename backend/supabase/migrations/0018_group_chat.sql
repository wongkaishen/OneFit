-- 0018: community group membership + group chat (issue #3, Phase 3).
--
-- Groups stay specialist-owned and open to read, but participating (posting +
-- chatting) now requires joining. group_members records membership;
-- group_messages is the live (polled) chat stream, kept separate from the
-- curated community_posts feed.

create table if not exists public.group_members (
    group_id  uuid not null references public.community_groups (group_id) on delete cascade,
    user_id   uuid not null references public.profiles (id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

create table if not exists public.group_messages (
    message_id uuid primary key default gen_random_uuid(),
    group_id   uuid not null references public.community_groups (group_id) on delete cascade,
    sender_id  uuid not null references public.profiles (id) on delete cascade,
    body       text not null,
    created_at timestamptz not null default now()
);
create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at);

alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;

-- Defense-in-depth: a user manages their own membership; members read their
-- groups' chat and post as themselves. The backend service role bypasses RLS.
create policy "group_members - self reads" on public.group_members for select
    using (user_id = auth.uid());
create policy "group_members - self joins" on public.group_members for insert
    with check (user_id = auth.uid());
create policy "group_members - self leaves" on public.group_members for delete
    using (user_id = auth.uid());

create policy "group_messages - member reads" on public.group_messages for select
    using (exists (
        select 1 from public.group_members m
        where m.group_id = group_messages.group_id and m.user_id = auth.uid()
    ));
create policy "group_messages - member writes" on public.group_messages for insert
    with check (sender_id = auth.uid() and exists (
        select 1 from public.group_members m
        where m.group_id = group_messages.group_id and m.user_id = auth.uid()
    ));
