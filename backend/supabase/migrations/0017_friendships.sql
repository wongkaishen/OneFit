-- 0017: friend graph (issue #3, Phase 2).
--
-- Request + accept model: a requester sends a friend request to an addressee;
-- the addressee accepts or declines. An accepted row means the two are friends
-- (and, per the messaging gate, may DM each other). The unordered-pair unique
-- index stops duplicate requests in either direction.

create table if not exists public.friendships (
    friendship_id uuid primary key default gen_random_uuid(),
    requester_id  uuid not null references public.profiles (id) on delete cascade,
    addressee_id  uuid not null references public.profiles (id) on delete cascade,
    status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at    timestamptz not null default now(),
    responded_at  timestamptz,
    check (requester_id <> addressee_id)
);

-- One relationship per unordered pair, regardless of who sent the request.
create unique index if not exists friendships_pair_uidx on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;
-- Defense-in-depth: either participant may read the row; only the requester
-- creates it; either participant may update (accept/decline/remove).
create policy "friendships - participant reads" on public.friendships for select
    using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships - requester inserts" on public.friendships for insert
    with check (requester_id = auth.uid());
create policy "friendships - participant updates" on public.friendships for update
    using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships - participant deletes" on public.friendships for delete
    using (requester_id = auth.uid() or addressee_id = auth.uid());
