-- 0005: exercises table.
-- The SDS data-design summary (p.45) lists an `Exercises` table — "Stores individual
-- exercises that make up a workout plan" — but gives no column dictionary for it. This
-- migration realises that entity: the per-exercise breakdown of a workout_plan, sitting
-- between workout_plans (the plan) and workout_sessions (a scheduled instance of a plan).
-- Columns follow the conventions of the surrounding 3.2.x tables in 0001_init.sql.

create table public.exercises (
    exercise_id  uuid primary key default gen_random_uuid(),
    plan_id      uuid not null references public.workout_plans (plan_id) on delete cascade,
    name         text not null,                         -- e.g. 'Back Squat'
    sets         int,                                   -- target number of sets
    reps         int,                                   -- target reps per set
    rest_seconds int,                                   -- rest between sets, in seconds
    order_index  int  not null default 0,               -- ordering within the plan
    notes        text,                                  -- coaching cues / tempo / load notes
    created_at   timestamptz not null default now()
);
create index on public.exercises (plan_id);

-- RLS: defense-in-depth, matching 0002_rls.sql. The backend uses the service-role key
-- and bypasses RLS; enabling it with no policy denies any direct (anon/auth) client
-- access, which is the safe default for a table reached only through the API.
alter table public.exercises enable row level security;
