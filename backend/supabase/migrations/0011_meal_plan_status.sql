-- 0011: meal-plan draft/published lifecycle.
--
-- meal_plans had no status, so there was no draft concept: "Save draft" inserted
-- a brand-new row and a draft could never be reopened, edited, or published from.
-- Add a status enum so a plan can be drafted, edited in place, then published
-- (the published transition is what assigns a client + notifies them).

create type meal_plan_status as enum ('draft', 'published');

alter table public.meal_plans
    add column status meal_plan_status not null default 'draft';

-- Backfill: an existing plan already assigned to a client was effectively
-- published; templates (client_id null) stay drafts.
update public.meal_plans set status = 'published' where client_id is not null;
