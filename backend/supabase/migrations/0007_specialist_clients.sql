-- 0007: explicit specialist <-> client relationship.
--
-- Before this, the specialist roster returned every profile with role 'gym_user',
-- so every specialist implicitly "owned" every gym user and could read/feedback/
-- meal-plan any of them. This table is the authoritative link: a gym user is a
-- specialist's client only via an explicit row here. All specialist roster/detail/
-- action queries scope to an 'active' relationship (enforced in FastAPI), and the
-- RLS policies below mirror that for any direct (anon/authenticated) access.

create type specialist_client_status as enum ('active', 'removed');

create table public.specialist_clients (
    specialist_id uuid not null references public.wellness_specialists (user_id) on delete cascade,
    client_id     uuid not null references public.gym_users (user_id)            on delete cascade,
    status        specialist_client_status not null default 'active',
    created_at    timestamptz not null default now(),
    primary key (specialist_id, client_id)
);
create index on public.specialist_clients (client_id);

alter table public.specialist_clients enable row level security;

-- The specialist owns and manages their own relationship rows.
create policy "sc - specialist manages" on public.specialist_clients for all
    using (specialist_id = auth.uid()) with check (specialist_id = auth.uid());
-- A gym user can see who they are a client of.
create policy "sc - client reads" on public.specialist_clients for select
    using (client_id = auth.uid());

-- Backfill: any meal plan already assigned to a client implies an active
-- relationship, so existing assignments are not stranded when the roster starts
-- scoping to this table. Idempotent.
insert into public.specialist_clients (specialist_id, client_id, status)
select distinct specialist_id, client_id, 'active'::specialist_client_status
from public.meal_plans
where client_id is not null
on conflict (specialist_id, client_id) do nothing;
