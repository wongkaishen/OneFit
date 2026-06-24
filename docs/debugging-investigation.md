# OneFit Debugging Investigation

**Date:** 2026-06-24
**Branch:** yap-fixing

> Investigation only — no code has been changed. Each issue records the root cause, affected files, a proposed solution, and a testing checklist. All issues are marked `Not fixed yet`.

---

## Update — 2026-06-24 (foundation fixes applied)

The original investigation above stands; the foundation slice has since been implemented and verified (backend smoke 13/13, frontend `lint` clean + `build` green). Migrations `0007`–`0010` were written to `backend/supabase/migrations/` **and** applied to Supabase project `cnsbxqinucvgiqknqwex`.

- **Issue 10 — FIXED.** New `public.specialist_clients` relationship table (+ RLS). `list_clients` rewritten as a single query scoped to `active` relationships (also kills the N+1), and `get_client` / `client_*` / `submit_feedback` / `create_meal_plan` now require an active relationship (404 otherwise). Added `POST /specialist/clients` (add by email) and `DELETE /specialist/clients/{id}`. Existing assignments backfilled from `meal_plans`.
- **Issue 9 — FIXED.** `profiles.status` defaults to `active`, the `handle_new_user` trigger sets `active`, pending rows backfilled. `suspended` is now enforced **server-side** (`core/security.py`) as well as in `AuthGate` (which now blocks only `suspended`).
- **Issue 5 — FIXED.** New `app/gym/meal-plans` page renders assigned plans (days/meals/kcal) + sidebar nav entry; the meal-plan notification deep-links to it.
- **Issues 1 & 3 — FIXED.** `notifications` gained `title` / `body` / `ref_type` / `ref_id` (migration `0009`); `notify()` and every call site now send structured content; the bell + detail modal render title→body and deep-link, and "mark all read" is a single `PATCH /notifications/read-all`.
- **Issue 4 — FIXED.** Feedback notes ride in the notification body, and there is now a dedicated read surface: `GET /gym/feedback` (joins the specialist's name), a `lib/api/gym.ts` `listFeedback` wrapper, an `app/gym/feedback` history page (+ sidebar nav), and the feedback notification deep-links to it (`?id=`). Two-way reply columns remain optional/out of scope.
- **Issue 8 — FIXED (pragmatic).** Roster N+1 eliminated, bulk mark-all added, and `NotificationBell` polling is now visibility-aware (no fetches in hidden tabs; instant refresh on focus/visibility regain). Realtime remains an optional future upgrade.
- **Issue 6 — FIXED.** Progress "Share latest" now builds a rich multi-line summary (latest measurements + weight trend vs the previous check-in + recent milestones + entry count) and uses the Web Share API (`navigator.share`) when available, falling back to clipboard, then to on-screen text.
- **Issue 7 — FIXED (incremental).** Added reusable `components/ui/PageIntro` (one-line purpose description) and `components/ui/EmptyState` (heading + next-action hint) primitives, and applied a `PageIntro` to every primary page across gym / specialist / admin, plus actionable empty states. No redesign.
- **Issue 10 surface — completed.** The specialist roster now has a per-row **Remove** button (calls the existing `DELETE /specialist/clients/{id}`).
- **Security (advisor).** `public.meal_plans` had RLS **disabled** (critical); migration `0010` enables RLS with specialist-manages / client-reads policies. Resolved.

- **Issue 2 — FIXED.** `meal_plans` gained a `status` enum (`draft` | `published`, migration `0011`). Backend adds `PATCH`/`DELETE /specialist/meal-plans/{id}`; create defaults to a draft. New `app/specialist/plans` manage list (status badges, client, delete) and `app/specialist/plans/[id]` edit route share a single `MealPlanBuilder` component, so a draft is captured on first save and edited in place (no duplicate rows). Publishing is the draft→published transition that assigns the client + notifies; editing a published plan updates in place without re-notifying. Sidebar "Plans" now points at the manage list.

**Post-slice fixes (found while reviewing):**

- **Specialist client-detail contract bug — FIXED.** The `ActivityLog`/`DietaryLog`/`ProgressEntry`/`GymMilestone` frontend DTOs had drifted from the backend (`activity_type` vs `workout_type`, `meal_type` vs `meal_time`, `entry_id` vs `progress_id`, `title/description` vs `type/badge`), so the specialist's "Recent activity" rendered blank. Types realigned to the ORM and the renderers updated.
- **Milestones never awarded — FIXED (regression).** `services/milestones.py` (`check_and_award`) existed with working rules but the current `gym_user/router.py` had lost the calls (they survived only in a stray, accidentally-committed backup file `router.py 19-23-50-862.py`). Re-wired `check_and_award` into `log_activity`/`log_diet`/`add_progress`, added a notification per awarded badge (deep-linking to Progress), and removed the stray backup file.

All ten investigation issues are now addressed. Optional future work (not defects): an invite/consent flow for adding clients (a specialist can currently add any gym user by email), two-way feedback replies, and Supabase Realtime for notifications instead of polling.

---

## Summary

The biggest structural problems found:

1. **No specialist↔client relationship exists.** The specialist roster query (`/specialist/clients`) returns **every** `profiles` row with `role = 'gym_user'`. There is no `specialist_clients` / invitation / assignment table anywhere in the schema. So every new specialist instantly "owns" all gym users, and any specialist can publish meal plans / feedback to any gym user (Issues 10, and the security side of 2 & 5).

2. **The notification model carries no structured content.** `public.notifications` has only a single `message` text column — no `title`, no `body`/`content`, and no foreign key to the related entity (meal plan, feedback, etc.). Meal-plan and feedback notifications are written as a single one-line string with no body and no link, so the detail modal has nothing extra to show (Issues 1, 3, 4).

3. **Meal plans have no lifecycle.** `public.meal_plans` has no `status` column and the specialist API exposes only `list` + `create` (no update/delete/publish). "Save draft" simply inserts a brand-new row with `client_id = null`; the page never captures the returned `plan_id`, and there is no edit page or manage list, so a draft can never be reopened or edited (Issue 2).

4. **The gym-user meal-planner UI is missing.** The backend endpoint `/gym/meal-plans` and the `listMealPlans()` API wrapper both exist, but there is no `app/gym/meal-plans` page and no "Meal Plans" entry in the gym sidebar, so a published plan is silently unreachable (Issue 5).

5. **Registration is gated by an admin-approval status.** `profiles.status` defaults to `'pending'`, the `handle_new_user` trigger never sets it to `'active'`, and the frontend `AuthGate` bounces any non-`active` user back to `/login`. New sign-ups therefore cannot use the app until an admin flips their status (Issue 9).

Smaller items: progress "share" is a minimal clipboard copy (Issue 6), there is essentially no in-app guidance/help (Issue 7), and there are several latency patterns worth addressing — notably the N+1 query in the client roster which compounds with the all-clients bug (Issue 8).

---

## Issue 1: Meal-plan notification only shows title, not content

### Current Behavior

A specialist publishes a meal plan to a gym user. The gym user gets a notification, but opening it shows only the one-line title — there is no message body and no way to reach the meal-plan details from the notification.

### Expected Behavior

The list shows the title only; clicking shows the full title, full message/content, and the related meal-plan details (or a link to them). The bell indicates unread notifications.

### Likely Root Cause

- `public.notifications` only has `message` (one `text` column) — no `title`/`content` split and no reference column linking to the meal plan. (`backend/supabase/migrations/0001_init.sql`, notifications table.)
- `create_meal_plan` calls `notify(..., message=f"Your specialist published a new meal plan: {body.name}")` — a single line with no `\n`, so there is no body to display and no `plan_id` reference. (`backend/app/subsystems/wellness_specialist/router.py:346-352`.)
- The shared detail modal splits `message` on the first newline into title + body (`components/shell/NotificationsPage.tsx` — `selTitle/selBody`). Because the meal-plan message has no newline and no body, the modal correctly renders only the title. The UI is not the bug; the **data has nothing more to show** and no link to the plan.

### Affected Files

- DB: `backend/supabase/migrations/0001_init.sql` (notifications table), would need a new migration.
- Backend: `backend/app/services/notification.py` (`notify` signature), `backend/app/subsystems/wellness_specialist/router.py` (`create_meal_plan`), `backend/app/subsystems/notifications/router.py` (response shape).
- Frontend: `frontend/lib/api/types.ts` (`NotificationOut`), `frontend/components/shell/NotificationsPage.tsx` (detail modal), `frontend/components/shell/NotificationBell.tsx`.
- API: `POST /specialist/meal-plans`, `GET /notifications`.
- DB tables: `notifications`, `meal_plans`.

### Proposed Solution

1. Migration: add `title text`, `body text` (nullable), and a generic reference (`ref_type text`, `ref_id uuid`) to `public.notifications` (keep `message` for backward compatibility or backfill it).
2. Extend `notify(...)` to accept `title`, `body`, `ref_type`, `ref_id`.
3. In `create_meal_plan`, send a notification with `title="New meal plan: {name}"`, a body summarizing the plan (goal, days), and `ref_type="meal_plan"`, `ref_id=plan.plan_id`.
4. Update `NotificationOut` and the detail modal to render `title` + `body`, and when `ref_type === "meal_plan"` show a "View meal plan" link to the gym meal-planner page (depends on Issue 5).

### Testing Checklist

* [ ] Publish a meal plan to a gym user; confirm the notification row stores title, body, and ref_id.
* [ ] Gym user list shows title only.
* [ ] Opening the notification shows title + body + a working link to the meal plan.
* [ ] Bell badge increments when the notification arrives and clears after read.

### Status

Not fixed yet

---

## Issue 2: Specialist cannot edit a saved meal-plan draft before publishing

### Current Behavior

A specialist builds a plan and clicks "Save draft". The draft cannot be reopened, edited, published from, or deleted. "Save draft" and "Publish plan" each create independent rows.

### Expected Behavior

Create draft → edit draft → publish draft → delete draft, with the draft remaining editable until published. Published plans stay viewable.

### Likely Root Cause

- `public.meal_plans` has **no `status` column** (only `client_id null = template`). There is no concept of draft vs published. (`backend/supabase/migrations/0004_specialist_admin.sql`.)
- The specialist API exposes only `list` and `create` — no `PATCH`/`PUT`/`DELETE`. (`backend/app/subsystems/wellness_specialist/router.py:310-355`; `frontend/lib/api/specialist.ts`.)
- The create page never stores the returned `plan_id`: `save(false)` and `save(true)` both call `createMealPlan(...)`, inserting a new row each time. "Save draft" just posts with `client_id: null`. (`frontend/app/specialist/plans/new/page.tsx:54-77`.)
- There is no edit route (`app/specialist/plans/[id]`) and no "manage / list drafts" page — only `app/specialist/plans/new/`. So a draft, once saved, is unreachable.

### Affected Files

- DB: new migration adding `status` (e.g. enum `draft | published`) to `public.meal_plans`.
- Backend: `backend/app/subsystems/wellness_specialist/router.py` (add update/delete/publish endpoints; `MealPlanIn`/`MealPlanOut` add `status`).
- Frontend: `frontend/lib/api/specialist.ts` (add `updateMealPlan`, `deleteMealPlan`), `frontend/app/specialist/plans/new/page.tsx` (capture `plan_id`, switch to edit mode after first save), a new `app/specialist/plans/page.tsx` (list/manage) and `app/specialist/plans/[id]/page.tsx` (edit).
- API: `POST /specialist/meal-plans` (return/accept status), new `PATCH/DELETE /specialist/meal-plans/{id}`.
- DB tables: `meal_plans`.

### Proposed Solution

1. Migration: add `status meal_plan_status not null default 'draft'` to `meal_plans`.
2. Backend: `create_meal_plan` saves `status='draft'` (no notify on draft). Add `PATCH /specialist/meal-plans/{id}` (owner-only; edit fields and/or transition `draft → published`, which sets `client_id` and fires the notification) and `DELETE /specialist/meal-plans/{id}` (owner-only).
3. Frontend: after the first "Save draft", store the returned `plan_id` and route to/operate in edit mode so subsequent saves `PATCH` instead of `POST`. Add a plans list page to reopen drafts; move the notify-on-publish to the publish action.

### Testing Checklist

* [ ] Save draft → row created with `status='draft'`, no notification sent.
* [ ] Reopen the draft from a list page and edit it; same `plan_id`, no duplicate row.
* [ ] Publish the draft → `status='published'`, `client_id` set, gym user notified.
* [ ] Delete a draft → row removed; published plans cannot be silently edited (rule TBD).

### Status

Not fixed yet

---

## Issue 3: Notification detail should show content only after click; bell should reflect unread

### Current Behavior

For feedback and similar notifications, the list shows a one-line title and the detail modal shows nothing more.

### Expected Behavior

List shows title + unread dot; detail shows title + full body and marks read on open; bell shows an unread indicator that updates after reading.

### Likely Root Cause

- Same data-model gap as Issue 1: notifications carry only `message`, so single-line notifications (feedback, task, meal_plan) have no body to reveal. Announcements work because the specialist/admin path writes `"{title}\n\n{body}"` (`wellness_specialist/router.py:214`), which the modal splits correctly.
- The **bell and read-state already work**: `NotificationBell.tsx` computes `unread` and renders a badge, polls every 30s, and `mark read` updates state; `NotificationsPage.tsx` marks read on open and supports "Mark all read". So the remaining work is data (give every notification a real body), not the read/unread plumbing.

### Affected Files

- DB/Backend/Frontend: same set as Issue 1 (notifications schema, `notify`, all `notify(...)` call sites that pass one-liners, `NotificationsPage.tsx`, `NotificationBell.tsx`).
- API: `GET /notifications`, `PATCH /notifications/{id}/read`.
- DB tables: `notifications`.

### Proposed Solution

Adopt the structured `title` + `body` (+ `ref`) model from Issue 1 and update every `notify(...)` call site (feedback, task, moderation, meal_plan) to pass a meaningful body. Keep the existing bell/read-state logic. Optionally reduce bell poll interval or add Supabase Realtime later.

### Testing Checklist

* [ ] Each notification type (feedback, task, meal_plan, announcement, moderation) shows a non-empty body on open.
* [ ] Opening a notification marks it read and decrements the bell badge.
* [ ] "Mark all read" clears the badge.
* [ ] Unread dot renders in both the bell dropdown and the full list.

### Status

Not fixed yet

---

## Issue 4: Feedback case shows only header, not content, on the gym-user side

### Current Behavior

The gym user sees only a generic header ("You have new feedback…") and cannot read the actual feedback notes, status, or any reply.

### Likely Root Cause

- `submit_feedback` stores the real text in `feedback.notes` but the notification it sends is a fixed string with **no content and no reference**: `notify(..., message="You have new feedback from your wellness specialist.")` (`wellness_specialist/router.py:193`).
- **There is no gym-user endpoint to read feedback.** `gym_user/router.py` has no `/gym/feedback` route, and `frontend/lib/api/gym.ts` has no feedback wrapper. So the notes are write-only from the gym user's perspective.
- `feedback` table has `notes` (full text) and `plan_updated`, but no title/status/reply columns. (`0001_init.sql` feedback table.)

### Expected Behavior

Gym user can open a feedback item and see the header, full message/notes, status if any, and any reply — ideally a feedback history/detail view.

### Affected Files

- Backend: `backend/app/subsystems/gym_user/router.py` (add `GET /gym/feedback` [+ detail]), `backend/app/subsystems/wellness_specialist/router.py` (richer feedback notification).
- Frontend: `frontend/lib/api/gym.ts` (`listFeedback`), a new `app/gym/feedback` page (or surface feedback in the notification detail via the `ref` link).
- API: new `GET /gym/feedback`.
- DB tables: `feedback`, `notifications`.

### Proposed Solution

1. Add `GET /gym/feedback` returning the caller's feedback rows (`notes`, `submitted_at`, `plan_updated`, specialist name).
2. Either add a `app/gym/feedback` list/detail page, or have the feedback notification carry `ref_type="feedback"` + `ref_id` (Issue 1 model) and render the notes inline in the notification detail.
3. (Optional, larger) add status/reply columns to `feedback` for two-way conversation.

### Testing Checklist

* [ ] Specialist submits feedback; gym user can fetch and read the full notes.
* [ ] Notification links to / shows the feedback content.
* [ ] No specialist can read another specialist's feedback; gym user sees only their own.

### Status

Not fixed yet

---

## Issue 5: Published meal plan is not received by the gym user (no meal-planner tab)

### Current Behavior

A specialist publishes a meal plan to a gym user, but the gym user has no page to view it.

### Likely Root Cause

- The plan **is** saved correctly and linked: `create_meal_plan` sets `client_id` and the gym read endpoint `GET /gym/meal-plans` filters `MealPlan.client_id == me` (`gym_user/router.py:216-224`). The API wrapper `listMealPlans()` also exists (`frontend/lib/api/gym.ts`).
- **The frontend UI is missing.** There is no `app/gym/meal-plans` (or `meal-planner`) page, and the gym sidebar (`app/gym/layout.tsx` `GYM_NAV`) has no "Meal Plans" entry. So the assigned plan is reachable by the API but not by any screen.
- Gym users also have no way to create their **own** meal plans (no gym-side create endpoint/page); only specialists author `meal_plans`.

### Expected Behavior

A dedicated gym Meal Planner tab showing plans assigned by the specialist, with clear separation of specialist-created vs self-created and draft vs published/active.

### Affected Files

- Frontend: new `app/gym/meal-plans/page.tsx`, `app/gym/layout.tsx` (add nav item). `frontend/lib/api/gym.ts` already has `listMealPlans`.
- Backend (for self-authored plans, optional): `backend/app/subsystems/gym_user/router.py` (gym-create endpoint), DB column to mark authorship/status.
- API: `GET /gym/meal-plans` (exists); optional `POST /gym/meal-plans`.
- DB tables: `meal_plans`.

### Proposed Solution

1. Add a gym Meal Planner page that calls `listMealPlans()` and renders the `payload` (day/meal/items) plus name, goal, days. Add the sidebar nav entry.
2. Tie in with Issue 1 so the meal-plan notification deep-links here.
3. (Optional) allow gym users to author their own plans — add `created_by` / `status` semantics and a gym create endpoint, and clearly separate specialist-assigned vs self-created vs draft vs published.

### Testing Checklist

* [ ] Specialist publishes to gym user A; user A sees the plan in the Meal Planner tab; user B does not.
* [ ] Plan payload renders (days, meals, calories).
* [ ] Notification deep-link opens the plan.
* [ ] (If implemented) gym user can draft/save their own plan, kept separate from assigned ones.

### Status

Not fixed yet

---

## Issue 6: Gym user "share progress" feature

### Current Behavior

A "Share latest" button exists on the progress page. It copies a one-line plain-text summary of the latest entry (weight + body fat) to the clipboard, falling back to displaying the text if clipboard access fails. (`frontend/app/gym/progress/page.tsx:42-51,78`.)

### Expected Behavior

Share progress safely and meaningfully — measurements, workout progress, milestones, or a chart summary — with sensible mobile vs desktop behavior.

### Likely Root Cause

Not broken, but minimal: only the single latest entry's weight/body-fat is shared; no milestones, no chart/image, no Web Share API (so no native mobile share sheet or image sharing), and no privacy/consent affordance.

### Affected Files

- Frontend: `frontend/app/gym/progress/page.tsx` (the `share` function), possibly a new share/export helper in `frontend/lib/`.
- API/DB: none required for client-side sharing; an internal "share to specialist" would need a backend endpoint.

### Proposed Solution

- Enrich the summary (latest measurements + recent milestones + trend) and use `navigator.share()` when available, falling back to clipboard.
- Optionally render a shareable image (canvas) of the progress chart for download.
- Decide the sharing target (external share vs internal "share with specialist") and document the privacy expectation.

### Testing Checklist

* [ ] Share on desktop copies/exports a meaningful summary.
* [ ] Share on mobile opens the native share sheet (Web Share API) where supported.
* [ ] Shared content includes measurements and milestones, not just one line.
* [ ] Graceful fallback when clipboard/share is unavailable.

### Status

Not fixed yet

---

## Issue 7: No guidance/help/instructions for users

### Current Behavior

Pages render data and forms with terse labels. Empty states are minimal ("No entries yet", "No notifications yet"); there is no onboarding, no per-feature explanation, and no role-specific help.

### Expected Behavior

Short, role-aware guidance on key pages (meal planner, notifications, progress sharing, feedback, client assignment), helpful empty states, and clear navigation for gym user / specialist / admin.

### Likely Root Cause

Guidance was never built; screens were implemented data-first.

### Affected Files (improvement areas — not a redesign)

- Frontend empty-state copy across `app/gym/*`, `app/specialist/*`, `app/admin/*`.
- Page headers/descriptions via `components/shell/TopBar.tsx` (could gain a `subtitle`/help slot).
- A small reusable `HelpText`/`EmptyState` UI primitive under `components/ui/`.

### Proposed Solution (document only)

- Add a one-line description under each page title explaining what the user can do there.
- Improve empty states to suggest the next action ("Publish your first meal plan", "Invite a client").
- Add lightweight tooltips/help text on non-obvious actions (publish vs draft, share, assign client).
- Consider a short first-run checklist per role. Keep it incremental; no full redesign.

### Testing Checklist

* [ ] Each major page has a short purpose description.
* [ ] Empty states guide the user to the next action.
* [ ] Key actions (publish, assign client, share) have help text.

### Status

Not fixed yet

---

## Issue 8: Poor response / slow app behavior

### Current Behavior

Some pages/actions feel slow.

### Expected Behavior

Common actions feel responsive, with loading states and no unnecessary repeated/oversized queries.

### Likely Root Cause (candidates)

- **N+1 in the client roster:** `list_clients` loops over every gym-user profile and calls `_client_row`, which issues **4 separate queries per client** (fitness profile + 3 `max()` aggregates). Combined with Issue 10 (returns *all* gym users), this scales as 4 × (#all gym users) on every roster load. (`wellness_specialist/router.py:222-265`.)
- **Bell polling:** `NotificationBell.tsx` re-fetches the full notification list every 30s for every mounted shell; "mark all read" issues one PATCH per unread notification in a loop (also in `NotificationsPage.tsx`).
- **Per-row reads elsewhere:** several handlers `db.get` related rows individually rather than joining.
- **Over-fetching:** roster returns all gym users regardless of relationship (Issue 10).

### Affected Files

- Backend: `backend/app/subsystems/wellness_specialist/router.py` (`_client_row`, `list_clients`).
- Frontend: `frontend/components/shell/NotificationBell.tsx`, `frontend/components/shell/NotificationsPage.tsx`.

### Proposed Solution

- Rewrite `list_clients` as a single query joining `profiles` + `fitness_profiles` with aggregated last-activity subqueries (and scope to assigned clients per Issue 10) to kill the N+1.
- Add a bulk "mark all read" endpoint instead of looping PATCH calls.
- Ensure loading states exist on all data screens (most already use `useResource`).
- Consider Supabase Realtime (or a longer/backoff poll) for notifications.

### Testing Checklist

* [ ] Roster load issues O(1)–O(few) queries, not 4×N.
* [ ] "Mark all read" is a single request.
* [ ] Pages show loading indicators during fetches.
* [ ] No duplicate fetches on mount.

### Status

Not fixed yet

---

## Issue 9: Supabase Auth should authorize users without admin approval

### Current Behavior

`register` proxies Supabase GoTrue signup, and the `handle_new_user` trigger inserts a `profiles` row. But `profiles.status` defaults to `'pending'` and is never set to `'active'`. The frontend `AuthGate` redirects any user whose `status !== 'active'` back to `/login`. So a freshly registered user cannot enter the app until an admin changes their status. The register docstring explicitly states accounts are "created with status 'pending' … and must be approved by an Admin". (`auth/router.py:93-114`; `0001_init.sql` profiles `status … default 'pending'`; `0002_rls.sql` trigger; `components/shell/AuthGate.tsx:23-26`.)

### Expected Behavior

Supabase Auth authenticates; new users can register/login without waiting for admin approval; role-based access still works (gym user / specialist / admin). Removing approval must not remove role checks.

### Likely Root Cause

Default `account_status = 'pending'` + `AuthGate` requiring `'active'` + no auto-activation in the trigger. Note the backend `require_role` guards check **role only, not status**, so the block is enforced purely client-side by `AuthGate` (and by product intent in the docstring). A separate `wellness_specialists.approval_status` also defaults to `'pending'` but is currently unused for gating.

### Affected Files

- DB: `backend/supabase/migrations/0001_init.sql` (profiles default) and/or `0002_rls.sql` (`handle_new_user` trigger) — new migration to default/insert `status='active'`.
- Backend: `backend/app/subsystems/auth/router.py` (register docstring/intent), `backend/app/core/security.py` (decide whether status should be enforced server-side at all).
- Frontend: `frontend/components/shell/AuthGate.tsx` (status gate).

### Proposed Solution

1. Make new accounts active by default — either change the column default to `'active'` or have `handle_new_user` insert `status = 'active'` (new migration; backfill existing `pending` rows that should be active).
2. Keep role resolution and `require_role` guards intact so each role still sees only its own surfaces.
3. Keep `status` (`suspended`) meaningful for admin moderation, but not as a registration gate. Update `AuthGate` to block only `suspended`, not `pending`.
4. Keep registration limited to `gym_user` / `wellness_specialist`; admins seeded manually (already the case).

### Testing Checklist

* [ ] Register a new gym user → can immediately log in and reach `/gym/dashboard`.
* [ ] Register a new specialist → can immediately reach `/specialist/clients`.
* [ ] Role checks still hold (gym user cannot reach specialist/admin routes).
* [ ] Admin can still `suspend` a user and that user is blocked.

### Status

Not fixed yet

---

## Issue 10: New specialist automatically gets all gym users as clients

### Current Behavior

A newly registered specialist's roster already lists every gym user.

### Expected Behavior

A new specialist starts with **zero** clients. A gym user becomes a client only via an explicit relationship (invitation code accepted, manual add, or assignment). Queries must filter by the actual relationship, not by `role = 'gym_user'`.

### Likely Root Cause

- `list_clients` returns every gym user with no relationship filter: `select(Profile).where(Profile.role == "gym_user")` — the docstring even says "MVP: specialist sees every gym user (no explicit assignment table yet)". (`wellness_specialist/router.py:258-265`.)
- **No relationship table exists.** A schema search finds no `specialist_clients` / `invitations` / `assignments` table; the only specialist↔client link anywhere is `meal_plans.client_id`. (`backend/supabase/migrations/*`.)
- Consequently `get_client`, `client_activity/diet/progress`, `submit_feedback`, and `create_meal_plan` authorize against `role == 'gym_user'` only — **any** specialist can read/act on **any** gym user, not just their own.

### Affected Files

- DB: new migration adding `public.specialist_clients` (and optionally an invitations table).
- Backend: `backend/app/subsystems/wellness_specialist/router.py` (`list_clients`, `get_client`, `client_*`, `submit_feedback`, `create_meal_plan` — scope all to the relationship), plus new invite/accept/add endpoints.
- Frontend: `app/specialist/clients/*` (empty state + "invite/add client" flow), `frontend/lib/api/specialist.ts`.
- DB: RLS policies in `0002_rls.sql` for any direct client access.

### Proposed Solution (correct model)

1. **Add an explicit relationship table** `public.specialist_clients(specialist_id, client_id, status, created_at)` (status e.g. `invited | active | removed`), unique on `(specialist_id, client_id)`. Optionally an `invitations(code, specialist_id, …)` table for invite-code acceptance.
2. **Filter every roster/detail/action query by this relationship** — join `specialist_clients` instead of `Profile.role == 'gym_user'`, and reject specialist actions on non-clients (403) in `get_client`, `client_*`, `submit_feedback`, `create_meal_plan`.
3. **Do not auto-assign on registration** — `_provision_subtype` must not create any relationship rows.
4. Add invitation/accept/manual-add endpoints so relationships are created explicitly.
5. Update RLS to enforce the relationship for any direct access.

### Testing Checklist

* [ ] A newly registered specialist's `/specialist/clients` returns an empty list.
* [ ] A gym user appears only after an explicit invite-accept / manual add.
* [ ] Specialist A cannot read/feedback/meal-plan specialist B's clients (403).
* [ ] Removing a client drops them from the roster and revokes access.
* [ ] Registration creates no relationship rows.

### Status

Not fixed yet

---

## Priority Order

1. **Client assignment / specialist sees all gym users (Issue 10)** — data-integrity & security: every specialist sees and can act on every gym user.
2. **Meal-planner publish/receive flow (Issue 5)** — published plans are unreachable by gym users (missing UI for an existing endpoint).
3. **Notification content/detail/bell flow (Issues 1 & 3)** — notifications carry no body/reference; core comms feels broken.
4. **Draft edit/publish/delete flow (Issue 2)** — specialists cannot iterate on a plan; drafts are lost.
5. **Feedback content visibility (Issue 4)** — gym users cannot read feedback at all (no endpoint).
6. **Gym-user meal-planner tab (Issue 5 cont.)** — full tab with assigned vs self-created separation.
7. **Share progress (Issue 6)** — works but minimal; enhancement.
8. **Guidance/help instructions (Issue 7)** — UX/onboarding improvement.
9. **Slow response / performance (Issue 8)** — largely resolves once Issue 10's all-clients N+1 is fixed; remaining items are incremental.
10. **Auth without admin approval (Issue 9)** — small, well-scoped change (status default + `AuthGate`); high impact, do early alongside Issue 10 since both touch registration/roles.

## Final Notes

Fix **Issue 10 first**: it is both a security defect (cross-specialist access) and the root of the Issue 8 performance problem, and it defines the relationship model that Issues 2, 4, and 5 build on. Pair it with **Issue 9** (a tiny status-default change) so newly registered specialists can actually log in to a *correctly empty* roster — together these make the registration→login→clients path behave as expected.

The notification data-model change (`title`/`body`/`ref_type`/`ref_id`) underpins Issues 1, 3, and 4, so design that schema once and reuse it. The meal-plan `status` column underpins Issue 2 and the gym meal-planner tab (Issue 5). Sequencing the two schema migrations (relationship table; notification + meal-plan status) early unblocks most of the remaining frontend work.

Do not implement the fixes yet — this document is investigation and proposed solutions only.
