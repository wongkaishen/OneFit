-- 0013: direct consultation messages between a gym user and their specialist (B15).

create table if not exists public.messages (
    message_id   uuid primary key default gen_random_uuid(),
    sender_id    uuid not null references public.profiles (id) on delete cascade,
    recipient_id uuid not null references public.profiles (id) on delete cascade,
    body         text not null,
    read_at      timestamptz,
    created_at   timestamptz not null default now()
);
create index if not exists messages_pair_idx
    on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_recipient_idx
    on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

-- Defense-in-depth: a participant may read their own threads; only the sender writes.
create policy "messages - participant reads" on public.messages for select
    using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages - sender writes" on public.messages for insert
    with check (sender_id = auth.uid());
