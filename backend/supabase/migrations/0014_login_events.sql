-- 0014: login attempt audit for suspicious-login monitoring (C16).

create table if not exists public.login_events (
    event_id   uuid primary key default gen_random_uuid(),
    email      text not null,
    user_id    uuid references public.profiles (id) on delete set null,
    success    boolean not null,
    ip         text,
    user_agent text,
    created_at timestamptz not null default now()
);
create index if not exists login_events_email_idx on public.login_events (email, created_at);
create index if not exists login_events_created_idx on public.login_events (created_at);

alter table public.login_events enable row level security;
-- No anon/authenticated policy: only the service role (which bypasses RLS) reads/writes.
