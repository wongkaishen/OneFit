-- 0004: meal plans table for the Wellness Specialist meal-plan builder.
-- The Specialist subsystem already covers Educational Content and Feedback in 0001;
-- this adds the persisted meal-plan canvas the frontend's CreateMealPlan screen produces.

create table public.meal_plans (
    plan_id         uuid primary key default gen_random_uuid(),
    specialist_id   uuid not null references public.wellness_specialists (user_id) on delete cascade,
    client_id       uuid references public.gym_users (user_id) on delete cascade,   -- null = template
    name            text not null,
    goal            text not null default 'maintain',
    days_per_week   int  not null default 7,
    payload         jsonb not null default '[]'::jsonb,                              -- [{day, meals:[...]}]
    created_at      timestamptz not null default now()
);
create index on public.meal_plans (specialist_id);
create index on public.meal_plans (client_id);
