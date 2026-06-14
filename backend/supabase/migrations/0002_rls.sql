-- OneFit Row-Level Security + auth integration (SDD §5.1.3, §5.1.5).
-- The FastAPI backend talks to the DB with the service-role key, which BYPASSES
-- RLS. These policies are defense-in-depth for any direct (anon/authenticated)
-- client access, and they encode the SDD rule that users see their own data and
-- specialists are scoped to the users they work with.

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row when an auth user is created.
-- Role/name can be passed via auth metadata; defaults to a pending gym_user.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, name, role)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data ->> 'name',
        coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'gym_user')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper: current user's role (used by policies; avoids recursive RLS).
-- (Named current_user_role to avoid the reserved current_role keyword.)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer set search_path = public
as $$
    select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table.
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.gym_users            enable row level security;
alter table public.wellness_specialists enable row level security;
alter table public.admins               enable row level security;
alter table public.fitness_profiles     enable row level security;
alter table public.workout_plans        enable row level security;
alter table public.workout_sessions     enable row level security;
alter table public.activity_logs        enable row level security;
alter table public.dietary_logs         enable row level security;
alter table public.progress_entries     enable row level security;
alter table public.milestones           enable row level security;
alter table public.wellness_tasks       enable row level security;
alter table public.educational_content  enable row level security;
alter table public.feedback             enable row level security;
alter table public.community_groups     enable row level security;
alter table public.community_posts      enable row level security;
alter table public.notifications        enable row level security;
alter table public.announcements        enable row level security;
alter table public.health_trend_reports enable row level security;
alter table public.audit_logs           enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: a user reads/updates their own row.
-- ---------------------------------------------------------------------------
create policy "own profile - read"   on public.profiles for select using (id = auth.uid());
create policy "own profile - update" on public.profiles for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Gym-user-owned data: the owner has full access to their own rows.
-- ---------------------------------------------------------------------------
create policy "own gym_user"   on public.gym_users        for select using (user_id = auth.uid());
create policy "own fitness"    on public.fitness_profiles for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own plans"      on public.workout_plans    for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own activity"   on public.activity_logs    for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own dietary"    on public.dietary_logs     for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress"   on public.progress_entries for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own milestones" on public.milestones       for all    using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_sessions belong to the user via their plan.
create policy "own sessions" on public.workout_sessions for all
    using (exists (select 1 from public.workout_plans p
                   where p.plan_id = workout_sessions.plan_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.workout_plans p
                        where p.plan_id = workout_sessions.plan_id and p.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Notifications: recipients read / mark their own.
-- ---------------------------------------------------------------------------
create policy "own notifications" on public.notifications for select using (recipient_id = auth.uid());
create policy "ack notifications" on public.notifications for update using (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Feedback: the gym user reads feedback about them; the specialist manages
-- the feedback they authored.
-- ---------------------------------------------------------------------------
create policy "feedback - subject reads"  on public.feedback for select using (user_id = auth.uid());
create policy "feedback - author manages" on public.feedback for all    using (specialist_id = auth.uid()) with check (specialist_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Educational content: published+visible is readable by any authenticated user;
-- the authoring specialist manages their own (any status).
-- ---------------------------------------------------------------------------
create policy "content - read published" on public.educational_content for select
    to authenticated using (status = 'Published' and visibility = true);
create policy "content - author manages" on public.educational_content for all
    using (specialist_id = auth.uid()) with check (specialist_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Community: authenticated users read groups/posts; authors manage their posts.
-- ---------------------------------------------------------------------------
create policy "groups - read" on public.community_groups for select to authenticated using (true);
create policy "posts - read"  on public.community_posts  for select to authenticated using (true);
create policy "posts - author manages" on public.community_posts for all
    using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Wellness tasks: the assigning specialist manages; the targeted gym user reads.
-- ---------------------------------------------------------------------------
create policy "tasks - specialist manages" on public.wellness_tasks for all
    using (specialist_id = auth.uid()) with check (specialist_id = auth.uid());
create policy "tasks - target reads" on public.wellness_tasks for select using (target_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Announcements: members read published ones (audience filtering done in the
-- backend); admins manage their own.
-- ---------------------------------------------------------------------------
create policy "announcements - read published" on public.announcements for select
    to authenticated using (status = 'published');
create policy "announcements - author manages" on public.announcements for all
    using (admin_id = auth.uid()) with check (admin_id = auth.uid());

-- Tables intentionally left with RLS enabled and NO permissive policy
-- (backend/service-role access only): wellness_specialists, admins,
-- health_trend_reports, audit_logs. Specialist- and admin-scoped reads of
-- other users' data are mediated by FastAPI, per the SDD architecture.
