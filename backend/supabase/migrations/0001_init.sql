-- OneFit initial schema (SDD v2.0 §3.2 Data Dictionary)
-- Authored as a Supabase migration; this is the schema source of truth.
-- The "User" entity maps onto Supabase Auth: passwords live in auth.users,
-- and public.profiles mirrors the SDD User row keyed by the Auth UID.
-- GymUser / WellnessSpecialist / Admin are subtype tables (class-table inheritance).

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
create type user_role            as enum ('gym_user', 'wellness_specialist', 'admin');
create type account_status       as enum ('pending', 'active', 'suspended');
create type membership_status    as enum ('active', 'suspended');
create type specialist_approval  as enum ('pending', 'approved', 'rejected');
create type plan_status          as enum ('active', 'superseded');
create type session_status       as enum ('scheduled', 'completed', 'missed');
create type activity_source      as enum ('manual', 'wearable');
create type activity_status      as enum ('pending', 'completed');
create type meal_time            as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type entry_mode           as enum ('quick', 'detailed');
create type task_status          as enum ('Assigned', 'InProgress', 'Submitted', 'UnderReview', 'Completed', 'Overdue', 'Cancelled');
create type content_status       as enum ('Draft', 'Published', 'Archived', 'Rejected');
create type post_status          as enum ('Posted', 'Flagged', 'UnderReview', 'Approved', 'Removed', 'Escalated');
create type post_severity        as enum ('low', 'medium', 'high');
create type notification_status  as enum ('read', 'unread');
create type announcement_audience as enum ('all', 'gym_users', 'specialists');
create type announcement_status  as enum ('draft', 'published');

-- ---------------------------------------------------------------------------
-- 3.2.1 User  ->  public.profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    name        text,
    email       text not null unique,
    role        user_role      not null default 'gym_user',
    status      account_status not null default 'pending',
    created_at  timestamptz    not null default now()
);
comment on table public.profiles is 'SDD 3.2.1 User. Password is held by Supabase Auth (auth.users).';

-- ---------------------------------------------------------------------------
-- 3.2.2 GymUser
-- ---------------------------------------------------------------------------
create table public.gym_users (
    user_id           uuid primary key references public.profiles (id) on delete cascade,
    membership_status membership_status not null default 'active'
);

-- ---------------------------------------------------------------------------
-- 3.2.4 WellnessSpecialist
-- ---------------------------------------------------------------------------
create table public.wellness_specialists (
    user_id           uuid primary key references public.profiles (id) on delete cascade,
    specialization    text not null,
    certification_doc text,                                   -- Supabase Storage URL
    approval_status   specialist_approval not null default 'pending'
);

-- ---------------------------------------------------------------------------
-- 3.2.5 Admin
-- ---------------------------------------------------------------------------
create table public.admins (
    user_id     uuid primary key references public.profiles (id) on delete cascade,
    permissions text
);

-- ---------------------------------------------------------------------------
-- 3.2.3 FitnessProfile  (1:1 with GymUser)
-- ---------------------------------------------------------------------------
create table public.fitness_profiles (
    user_id          uuid primary key references public.gym_users (user_id) on delete cascade,
    age              int,
    height           numeric(5, 2),                           -- cm
    weight           numeric(5, 2),                           -- kg
    body_fat_percent numeric(5, 2),
    fitness_goal     text
);

-- ---------------------------------------------------------------------------
-- 3.2.6 WorkoutPlan
-- ---------------------------------------------------------------------------
create table public.workout_plans (
    plan_id      uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.gym_users (user_id) on delete cascade,
    goal         text not null,
    generated_by text not null default 'manual',              -- 'manual' (MVP) | 'groq' (future AI)
    status       plan_status not null default 'active',
    created_at   timestamptz not null default now()
);
create index on public.workout_plans (user_id);

-- ---------------------------------------------------------------------------
-- 3.2.7 WorkoutSession
-- ---------------------------------------------------------------------------
create table public.workout_sessions (
    session_id     uuid primary key default gen_random_uuid(),
    plan_id        uuid not null references public.workout_plans (plan_id) on delete cascade,
    scheduled_date date not null,
    scheduled_time time not null,
    reminder_set   boolean not null default false,
    status         session_status not null default 'scheduled'
);
create index on public.workout_sessions (plan_id);

-- ---------------------------------------------------------------------------
-- 3.2.8 ActivityLog
-- ---------------------------------------------------------------------------
create table public.activity_logs (
    log_id          uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.gym_users (user_id) on delete cascade,
    workout_type    text,
    duration        int,                                      -- minutes
    steps           int,
    heart_rate      int,                                      -- bpm
    calories_burned numeric(7, 2),
    source          activity_source not null default 'manual',
    log_date        date not null,
    status          activity_status not null default 'pending'
);
create index on public.activity_logs (user_id, log_date);

-- ---------------------------------------------------------------------------
-- 3.2.9 DietaryLog
-- ---------------------------------------------------------------------------
create table public.dietary_logs (
    log_id     uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.gym_users (user_id) on delete cascade,
    meal_time  meal_time,
    food_item  text,
    calories   numeric(7, 2) not null,
    protein    numeric(6, 2),
    carbs      numeric(6, 2),
    fat        numeric(6, 2),
    entry_mode entry_mode not null default 'quick',
    log_date   date not null
);
create index on public.dietary_logs (user_id, log_date);

-- ---------------------------------------------------------------------------
-- 3.2.10 ProgressEntry
-- ---------------------------------------------------------------------------
create table public.progress_entries (
    progress_id      uuid primary key default gen_random_uuid(),
    user_id          uuid not null references public.gym_users (user_id) on delete cascade,
    weight           numeric(5, 2),
    body_fat_percent numeric(5, 2),
    height           numeric(5, 2),
    photo_url        text,                                    -- Supabase Storage URL
    recorded_at      timestamptz not null default now()
);
create index on public.progress_entries (user_id, recorded_at);

-- ---------------------------------------------------------------------------
-- 3.2.11 Milestone
-- ---------------------------------------------------------------------------
create table public.milestones (
    milestone_id uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.gym_users (user_id) on delete cascade,
    type         text not null,                               -- streak, -5kg, first PR
    badge        text,
    achieved_at  timestamptz not null default now()
);
create index on public.milestones (user_id);

-- ---------------------------------------------------------------------------
-- 3.2.12 WellnessTask
-- target_id is polymorphic (a GymUser or a CommunityGroup) per SDD, so no FK.
-- ---------------------------------------------------------------------------
create table public.wellness_tasks (
    task_id       uuid primary key default gen_random_uuid(),
    specialist_id uuid not null references public.wellness_specialists (user_id) on delete cascade,
    target_id     uuid not null,
    type          text not null,
    description   text not null,
    target_metric text,
    due_date      date not null,
    status        task_status not null default 'Assigned'
);
create index on public.wellness_tasks (specialist_id);
create index on public.wellness_tasks (target_id);

-- ---------------------------------------------------------------------------
-- 3.2.13 EducationalContent
-- ---------------------------------------------------------------------------
create table public.educational_content (
    content_id          uuid primary key default gen_random_uuid(),
    specialist_id       uuid not null references public.wellness_specialists (user_id) on delete cascade,
    title               text not null,
    body                text not null,
    category            text not null,
    media_url           text,                                 -- Supabase Storage URL
    visibility          boolean not null default true,        -- false once archived
    status              content_status not null default 'Draft',
    permission_confirmed boolean not null default false,      -- copyright / permission declared
    created_at          timestamptz not null default now()
);
create index on public.educational_content (specialist_id);

-- ---------------------------------------------------------------------------
-- 3.2.14 Feedback
-- ---------------------------------------------------------------------------
create table public.feedback (
    feedback_id   uuid primary key default gen_random_uuid(),
    specialist_id uuid not null references public.wellness_specialists (user_id) on delete cascade,
    user_id       uuid not null references public.gym_users (user_id) on delete cascade,
    notes         text not null,
    plan_updated  boolean not null default false,             -- future: AI recalculated the plan
    submitted_at  timestamptz not null default now()
);
create index on public.feedback (user_id);
create index on public.feedback (specialist_id);

-- ---------------------------------------------------------------------------
-- 3.2.15 CommunityGroup
-- ---------------------------------------------------------------------------
create table public.community_groups (
    group_id      uuid primary key default gen_random_uuid(),
    name          text not null,
    description   text,
    specialist_id uuid not null references public.wellness_specialists (user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- 3.2.16 CommunityPost
-- ---------------------------------------------------------------------------
create table public.community_posts (
    post_id    uuid primary key default gen_random_uuid(),
    group_id   uuid not null references public.community_groups (group_id) on delete cascade,
    author_id  uuid not null references public.profiles (id) on delete cascade,
    content    text not null,
    status     post_status not null default 'Posted',
    severity   post_severity,
    created_at timestamptz not null default now()
);
create index on public.community_posts (group_id);

-- ---------------------------------------------------------------------------
-- 3.2.17 Notification  (SDD field "timestamp" -> sent_at)
-- ---------------------------------------------------------------------------
create table public.notifications (
    notification_id uuid primary key default gen_random_uuid(),
    recipient_id    uuid not null references public.profiles (id) on delete cascade,
    type            text not null,                            -- feedback | schedule | task
    message         text not null,
    status          notification_status not null default 'unread',
    sent_at         timestamptz not null default now()
);
create index on public.notifications (recipient_id, status);

-- ---------------------------------------------------------------------------
-- 3.2.18 Announcement
-- ---------------------------------------------------------------------------
create table public.announcements (
    announcement_id uuid primary key default gen_random_uuid(),
    admin_id        uuid not null references public.admins (user_id) on delete cascade,
    title           text not null,
    body            text not null,
    target_audience announcement_audience not null default 'all',
    status          announcement_status not null default 'draft',
    sent_at         timestamptz
);

-- ---------------------------------------------------------------------------
-- 3.2.19 HealthTrendReport
-- ---------------------------------------------------------------------------
create table public.health_trend_reports (
    report_id            uuid primary key default gen_random_uuid(),
    specialist_id        uuid not null references public.wellness_specialists (user_id) on delete cascade,
    cohort               text not null,
    period               text not null,
    adherence            numeric(5, 2),
    avg_calories         numeric(7, 2),
    activity_consistency numeric(5, 2),
    milestone_rate       numeric(5, 2),
    created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3.2.20 AuditLog  (SDD field "timestamp" -> created_at)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
    log_id     uuid primary key default gen_random_uuid(),
    actor_id   uuid references public.profiles (id) on delete set null,
    action     text not null,
    details    text,
    created_at timestamptz not null default now()
);
create index on public.audit_logs (actor_id);
