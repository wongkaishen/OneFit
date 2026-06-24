# System Documentation
# Individual Report
# for
# OneFit

**Version 3.0**

**Tutorial Section:** TT4L
**Group No.:** Group 11

| Wong Kai Shen | 243UC247DH |
|---------------|------------|

**Date:** 18 Jun 2026

---

## Contents

- Revisions
- 1 System Overview
  - 1.1 Description
  - 1.2 Use Cases
  - 1.3 Assumptions and Dependencies
- 2 Requirements
  - 2.1 Use Case Diagram
  - 2.2 Class Diagrams / ERD
- 3 Design
  - 3.1 Use Cases
    - 3.1.1 Use Case 1 — Provide Professional Feedback
    - 3.1.2 Use Case 2 — Review Health Trends
  - 3.2 Data Dictionary
  - 3.3 Subsystem Architecture
  - 3.4 Subsystem Screens
  - 3.5 Subsystem Components
    - 3.5.1 Component 1 — Feedback & Notification Service
    - 3.5.2 Component 2 — Health-Trend Aggregation
  - 3.6 Actor 1 State Transition Diagram
- 4 Implementation
  - 4.1 Development Environment
  - 4.2 Main Program Codes
    - 4.2.1 wellness_specialist/router.py
    - 4.2.2 lib/api/specialist.ts
  - 4.3 Sample Screens
- 5 Testing
  - 5.1 Test Data
  - 5.2 Acceptance Testing
  - 5.3 Test Results
- 6 Conclusion

---

## Revisions

| Version | Primary Author(s) | Description of Version | Date Completed |
|---------|-------------------|------------------------|----------------|
| Ver 1.0 (Part I) | Yap, Wong, Thee | SRS — problem statement, actors, use cases, class diagram/ERD, NFRs | 16/04/2026 |
| Ver 2.0 (Part II) | Yap Hui Chi, Wong Kai Shen, Thee Khai Qin | SDS — activity, sequence & state diagrams, data dictionary, architecture, interface & component design | 07/06/2026 |
| Ver 3.0 (Part III) | Wong Kai Shen | Working prototype, implementation walkthrough, testing procedures, project monitoring, development journey | 18/06/2026 |

> **About this individual report.** This Part III document is authored by **Wong Kai Shen**
> and concentrates on the **Wellness Specialist subsystem** — the subsystem I designed, built,
> and tested. Throughout this report, "**Subsystem 1**" and "**Actor 1**" refer to the Wellness
> Specialist surface. The Gym User and Admin subsystems (built by my groupmates) appear only as
> the integration context that the Specialist features depend on. OneFit realises the SRS
> (v1.0) and SDS (v2.0) as a running prototype; where the build deviates from the design, the
> deviation and rationale are recorded so requirements/design traceability is preserved.

---

# 1 System Overview

## 1.1 Description

**OneFit** is a digital wellness platform that combats sedentary behaviour, poor diet, and
chronic stress among Gen Z / Gen Alpha by embedding self-care and professional coaching into a
digital-native workflow. The system facilitates interactions between three primary actors —
**Gym User**, **Wellness Specialist**, and **Admin** — plus a deferred **AI & Integration**
tier.

The prototype is a **monorepo with two deployables**:

- **`frontend/`** — Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS. Renders the
  three actor surfaces plus shared auth screens.
- **`backend/`** — FastAPI + async SQLAlchemy 2.0 + asyncpg, organised into one router per SDD
  subsystem. **Supabase** (Postgres + Auth + Storage) is the data tier.

**Subsystem 1 — Wellness Specialist (this report's focus).** The Wellness Specialist
(health coach / nutritionist) supports gym users professionally. The subsystem lets a
specialist:

- Review a client roster and drill into each client's activity, diet, and progress (UC1).
- Assign customised wellness tasks with validation and notification (UC2).
- Author and publish educational content behind a copyright-confirmation gate (UC3).
- Provide professional feedback that automatically notifies the gym user (UC4).
- Moderate community posts — warn, remove, or escalate to Admin (UC5).
- Generate anonymised cohort health-trend reports (UC6).
- Author meal plans (per-client or reusable templates) and broadcast announcements.

It reads the data the **Gym User** subsystem produces and is governed by the **Admin**
subsystem (account approval/suspension). The **AI & Integration** tier (workout-plan
generation, nutrition lookup) is intentionally deferred — every AI endpoint returns HTTP 501 —
so the manual specialist flows are complete today and AI can be dropped in later without
touching actor code.

## 1.2 Use Cases

The table below lists the **Wellness Specialist (Actor 1)** use cases. The other two actors are
summarised afterwards as integration context only.

| Actor | Use Cases |
|-------|-----------|
| **Wellness Specialist (Actor 1)** | UC1 Review User Progress Reports · UC2 Assign Customised Wellness Tasks · UC3 Manage Educational Content · UC4 Provide Professional Feedback & Consultation · UC5 Monitor Community Groups · UC6 Review Health Trends · (+ author meal plans, broadcast announcements) |
| Gym User *(context)* | Register/login · Manage profile · Create workout plan · Log activity · Log diet · Update progress · Schedule workout · Receive notification |
| Admin *(context)* | View/manage users · Assign roles · Approve registrations · Reinstate membership · Monitor activity · Remove inactive programs · Send announcements |

**Wellness Specialist use cases — realisation status:**

| Use Case | Backend endpoint(s) | Frontend route | Status |
|----------|---------------------|----------------|--------|
| UC1 Review User Progress Reports | `GET /specialist/clients`, `/clients/{id}`, `/clients/{id}/activity\|diet\|progress` | `/specialist/clients`, `/specialist/clients/[id]` | ✅ Implemented |
| UC2 Assign Customised Wellness Tasks | `GET/POST /specialist/tasks` | `/specialist/clients/[id]` | ✅ Implemented (validates type/description/due-date; notifies user) |
| UC3 Manage Educational Content | `GET/POST /specialist/content` | `/specialist/content` | ✅ Implemented (copyright-confirmation gate → 422 if unconfirmed) |
| UC4 Provide Professional Feedback | `POST /specialist/feedback` | `/specialist/clients/[id]` | ✅ Implemented (notifies user; AI plan recalculation deferred) |
| UC5 Monitor Community Groups | `GET /specialist/community/groups`, `/groups/{id}/posts`, `POST /community/posts/{id}/moderate` | (API + reports) | ✅ Implemented (warn / remove / escalate-to-admin) |
| UC6 Review Health Trends | `GET/POST /specialist/health-trends` | `/specialist/reports` | ✅ Implemented (anonymised cohort aggregates) |
| Author Meal Plans | `GET/POST /specialist/meal-plans` | `/specialist/plans/new` | ✅ Implemented (jsonb canvas; client or template) |
| Broadcast Announcement | `POST /specialist/announcements` | `/specialist/announce` | ✅ Implemented (notification fan-out) |

## 1.3 Assumptions and Dependencies

**Assumptions** — specialists access the app via a modern browser over HTTPS; a specialist
holds the legal rights to any educational content they upload (declared via the copyright
checkbox the subsystem enforces); gym users enter their activity/diet/progress data honestly,
since the Specialist's reviews and trend reports are only as accurate as that input; the
platform targets ~500 concurrent users; OneFit is a wellness *guide*, not a medical service.

**Dependencies** — **Supabase** (Postgres + Auth + Storage) for identity, persistence,
Row-Level Security, and media storage; the **FastAPI** application tier, which mediates all
sensitive traffic and is where the Specialist's business logic lives; the **Admin subsystem**,
on which specialist account approval and member suspension depend; and, on the roadmap, the
**AI & Integration** tier (Groq LLM for plan/feedback generation, USDA nutrition lookup) — *not*
required for this prototype because those endpoints are deferred (501) by design.

---

# 2 Requirements

## 2.1 Use Case Diagram

The use-case diagram (SRS §2.4 / SDS §1.4) shows the three human actors plus the non-human
**AI/Integration** actor. The prototype's route map (§1.2) is a one-to-one realisation of the
Wellness Specialist slice of that diagram, which is how requirements traceability is kept into
Part III.

> **Insert here:** the use-case diagram image (Wellness Specialist actor highlighted).

## 2.2 Class Diagrams / ERD

The ERD is the **source of truth** for the schema and lives as SQL in
`backend/supabase/migrations/`. The SQLAlchemy ORM (`backend/app/models/entities.py`) maps onto
it and does **not** create tables. The entities the Wellness Specialist subsystem reads/writes:
`profiles`, `fitness_profile`, `activity_logs`, `dietary_logs`, `progress_entries`,
`milestones` (read, for client review and trend metrics); `feedback`, `wellness_tasks`,
`educational_content`, `meal_plans`, `community_groups`, `community_posts`,
`health_trend_reports`, `notifications`, `audit_logs` (write).

> **Insert here:** the design class diagram / ERD image (SDS §3.1).

---

# 3 Design

## 3.1 Use Cases

Two representative Wellness Specialist use cases are detailed below with their behavioural
(sequence) realisation. The full set of specialist sequence diagrams is in SDS §4.1.11–§4.1.16.

### 3.1.1 Use Case 1 — Provide Professional Feedback (UC4)

**Description.** A specialist opens a client, drafts advice, and submits feedback. Per the SDD
rule, submitting feedback **notifies the gym user**. In the MVP the specialist edits the plan
manually; AI auto-recalculation is deferred.

**Realised sequence** (`POST /specialist/feedback`):

1. Browser sends the feedback payload with `Authorization: Bearer <jwt>`.
2. FastAPI's `require_specialist` guard verifies the JWT and the caller's role.
3. A `Feedback` row is inserted (`specialist_id`, `user_id`, `notes`, `plan_updated`).
4. `notify()` fans an in-app notification to the gym user.
5. A single transaction commits — so feedback and its notification are atomic.
6. The gym user sees an unread bell and a `/gym/notifications` entry.

This matches SDS §4.1.14, with the AI plan-recalculation lane greyed out (deferred).

> **Insert here:** sequence diagram for UC4 (SDS §4.1.14).

### 3.1.2 Use Case 2 — Review Health Trends (UC6)

**Description.** A specialist generates an **anonymised** cohort report to spot patterns (e.g.
stagnant weight loss across users) and decide where to intervene.

**Realised sequence** (`POST /specialist/health-trends`):

1. `require_specialist` guard authorises the request.
2. The service aggregates four metrics over all gym users — adherence, average calories,
   activity consistency, milestone rate (see §3.5.2 for the algorithm).
3. A `health_trend_reports` row is persisted with the aggregates only — **no per-user
   identifier is stored or returned**, realising SRS privacy NFR 5.6.
4. The report is returned and rendered on `/specialist/reports`.

This matches SDS §4.1.16.

> **Insert here:** sequence diagram for UC6 (SDS §4.1.16).

## 3.2 Data Dictionary

The full 20-entity data dictionary is in SDS §3.2, realised verbatim by migrations
`0001_init.sql` … `0006_backfill_profiles.sql`. The tables central to the Wellness Specialist
subsystem:

| Table | PK | Purpose (as built) |
|-------|----|--------------------|
| `feedback` | `feedback_id` | Specialist → user feedback; `notes`, `plan_updated`, `submitted_at`. |
| `wellness_tasks` | `task_id` | Specialist-assigned task; `type`, `description`, `target_metric`, `due_date`, lifecycle `status`. |
| `educational_content` | `content_id` | `title`, `body`, `category`, `media_url`, `permission_confirmed`, `status` (Draft/Published/Archived/Rejected), `visibility`. |
| `meal_plans` | `plan_id` | jsonb `payload` canvas; `client_id` null ⇒ reusable template; `goal`, `days_per_week`. |
| `community_groups` / `community_posts` | `group_id` / `post_id` | Moderated groups; post `status` + `severity`. |
| `health_trend_reports` | `report_id` | `cohort`, `period`, `adherence`, `avg_calories`, `activity_consistency`, `milestone_rate` — aggregates only. |
| `notifications` | `notification_id` | In-app fan-out (`recipient_id`, `type`, `message`, `status`). |
| `audit_logs` | `log_id` | One row per privileged action (e.g. post moderation). |
| `profiles`, `fitness_profile`, `activity_logs`, `dietary_logs`, `progress_entries`, `milestones` | — | Read for the client roster, client detail, and trend metrics. |

> **Insert here:** the relevant data-dictionary tables image (SDS §3.2.12–§3.2.20).

## 3.3 Subsystem Architecture

OneFit realises the **4-tier, cloud architecture** from SDS §5.1. The Wellness Specialist
subsystem is one of the feature subsystems in the application tier:

```
┌──────────────────────────────────────────────────────────────────┐
│ Client Tier        Browser (Wellness Specialist) — HTTPS           │
├──────────────────────────────────────────────────────────────────┤
│ Presentation Tier  Next.js 14 App Router  →  app/specialist/*       │
│                    lib/api/specialist.ts  →  lib/api/client.ts       │
│                    (Bearer JWT; 501 → "AI coming soon")             │
├──────────────────────────────────────────────────────────────────┤
│ Application Tier   FastAPI — subsystems/wellness_specialist/router  │
│                    require_specialist guard (core/security.py)      │
│                    Platform services: notification · audit          │
│                    ── AI orchestration → 501 (deferred boundary) ── │
├──────────────────────────────────────────────────────────────────┤
│ Data Tier          Supabase: Postgres + RLS, Auth (JWT), Storage   │
├──────────────────────────────────────────────────────────────────┤
│ External (roadmap) USDA FoodData · Groq LLM · Hugging Face · SMTP  │
└──────────────────────────────────────────────────────────────────┘
```

`backend/app/main.py` mounts the specialist router at `/specialist`. Every specialist endpoint
passes through `require_specialist`, which verifies the Supabase JWT (HS256 secret **or**
asymmetric JWKS, selected from the token header) and resolves the caller's `profiles` row.
Privileged actions (post moderation) call `record_audit()`; user-facing events (feedback,
tasks, meal plans) call `notify()` — both share the request's transaction.

> **Insert here:** the architecture / deployment diagram (SDS §5.1, §8.1).

## 3.4 Subsystem Screens

Realised App-Router routes for the Wellness Specialist subsystem (all build successfully —
§5.3):

- `/specialist/clients` — client roster (name, goal, weight, last-active).
- `/specialist/clients/[id]` — client detail: activity/diet/progress reads, **Feedback** module
  (UC4), **Assign Task** form (UC2).
- `/specialist/content` — educational content list + create (UC3, copyright gate).
- `/specialist/plans/new` — meal-plan builder (jsonb canvas).
- `/specialist/reports` — health-trends dashboard (UC6).
- `/specialist/announce` — broadcast announcement.
- `/specialist/notifications` — the specialist's own notification centre.

Screens are built from the design tokens in `tailwind.config.ts` (cream/charcoal/coral palette,
Inter + EB Garamond) and the shared shell (`Sidebar`, `TopBar`, `Avatar`, `NotificationBell`) —
no hard-coded hex values.

> **Insert here:** annotated screenshots of each Wellness Specialist screen.

## 3.5 Subsystem Components

The Wellness Specialist subsystem decomposes into the service operations in
`subsystems/wellness_specialist/router.py`, backed by the shared `notification` and `audit`
platform services. The two most algorithmically significant components are detailed below.

### 3.5.1 Component 1 — Feedback & Notification Service (UC4)

**Responsibility.** Persist specialist feedback and guarantee the gym user is notified, atomically.

**Processing (pseudocode):**

```
on submit_feedback(user_id, notes, plan_updated):
    require role == wellness_specialist            # guard
    fb = Feedback(specialist_id, user_id, notes, plan_updated, submitted_at=now)
    add(fb)
    notify(recipient_id=user_id, type="feedback",
           message="You have new feedback from your wellness specialist.")
    commit()                                       # fb + notification in one transaction
    return fb
```

The same pattern (validate → write → `notify()` → single commit) backs **Assign Wellness
Task** (which additionally rejects blank type/description and past due-dates with HTTP 422) and
**Author Meal Plan** (which notifies the client when `client_id` is set).

> **Insert here:** activity diagram for the feedback component (SDS §2.2.4).

### 3.5.2 Component 2 — Health-Trend Aggregation (UC6)

**Responsibility.** Produce four cohort metrics over all gym users **without storing or
returning any per-user identifier** (privacy NFR 5.6).

**Processing (pseudocode):**

```
on create_health_trend(cohort, period):
    require role == wellness_specialist
    total_gym        = count(gym_users)
    sessions         = count(workout_sessions) grouped by status
    adherence        = 100 * completed / total_sessions          # %, null if none
    avg_calories     = mean(dietary_logs.calories)
    activity_consist = 100 * distinct(activity_logs.user_id) / total_gym
    milestone_rate   = 100 * distinct(milestones.user_id)   / total_gym
    persist(health_trend_reports, {cohort, period, adherence, avg_calories,
                                   activity_consist, milestone_rate, created_at})
    return report                                  # aggregates only — no user ids
```

A third component, **Community Post Moderation**, implements the post state machine
(warn → `Flagged`, remove → `Removed`, escalate → `Escalated` + notify every admin) and writes
an `audit_logs` row for each action.

> **Insert here:** activity diagram / flowchart for the health-trend component (SDS §2.2.6).

## 3.6 Actor 1 State Transition Diagram

**Actor 1 = Wellness Specialist.** The states the prototype enforces across the specialist's
workflow:

- **Specialist account lifecycle:** `Pending → Approved → Active` (or `Pending → Rejected`).
  A specialist cannot reach any `/specialist/*` route until the Admin approves the account
  (`require_specialist` resolves the `profiles` role/status).
- **Educational content** (authored by the specialist): `Draft → Published → Archived`
  (or `Rejected`). Saving is blocked until `permission_confirmed` is true.
- **Wellness task** (specialist → user): `Assigned → InProgress → Submitted → UnderReview →
  Completed`, with `Overdue` / `Cancelled` branches.
- **Community post moderation** (specialist-driven): `Posted → Flagged → UnderReview →
  Approved / Removed / Escalated`.

> **Insert here:** the UML state-transition diagram for the Wellness Specialist (SDS §4.2.5–§4.2.10).

---

# 4 Implementation

## 4.1 Development Environment

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend framework | Next.js (App Router) | 14.2.5 |
| UI | React / React-DOM | 18.3.1 |
| Language | TypeScript | 5.5.3 |
| Styling | Tailwind CSS | 3.4.6 |
| Backend framework | FastAPI | 0.115.6 |
| ASGI server | Uvicorn | 0.34.0 |
| ORM | SQLAlchemy (async) | 2.0.36 |
| DB driver | asyncpg | 0.30.0 |
| Validation | Pydantic | 2.10.4 |
| Auth/JWT | PyJWT[crypto] | 2.10.1 |
| Data tier | Supabase (Postgres + Auth + Storage) | project `cnsbxqinucvgiqknqwex` |
| VCS / collaboration | Git + GitHub | branch `Fixes` → `main` |

**Local run.** Frontend: `npm install && npm run dev` (`:3000`). Backend:
`source env/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload`
(`:8000`, Swagger at `/docs`). In dev, the specialist authenticates with a pasted Supabase
access token (`NEXT_PUBLIC_DEV_JWT`) or `localStorage["onefit-jwt"]`.

> **Insert here:** screenshots of the running dev servers, the FastAPI `/docs` Swagger page,
> and the VS Code workspace.

## 4.2 Main Program Codes

| Application | Files |
|-------------|-------|
| Backend (FastAPI) — Wellness Specialist | `app/subsystems/wellness_specialist/router.py`, `app/core/security.py` (`require_specialist`), `app/services/notification.py`, `app/services/audit.py`, `app/models/entities.py` |
| Frontend (Next.js) — Wellness Specialist | `lib/api/specialist.ts`, `lib/api/client.ts`, `app/specialist/clients/[id]/page.tsx`, `app/specialist/content/page.tsx`, `app/specialist/reports/page.tsx`, `app/specialist/plans/new/page.tsx` |
| Database (Supabase) | `supabase/migrations/0001_init.sql` … `0006_backfill_profiles.sql` |

### 4.2.1 wellness_specialist/router.py

The application-tier heart of the subsystem. It declares `require_specialist` as a dependency
on every route, defines the Pydantic request/response schemas, and implements UC1–UC6:

- **UC3 content** rejects an unconfirmed copyright declaration with HTTP 422 before writing.
- **UC4 feedback** inserts a `Feedback` row and calls `notify()` in the same transaction.
- **UC2 tasks** validate type/description and reject past due-dates (422), then notify the user.
- **UC5 moderation** branches on warn/remove/escalate, notifies the author (and all admins on
  escalate), and writes an audit-log row.
- **UC6 health-trends** computes the four anonymised aggregates and persists a report.

> **Insert here:** code screenshot of `submit_feedback`, `assign_task`, and
> `create_health_trend` in `wellness_specialist/router.py`.

### 4.2.2 lib/api/specialist.ts

The typed frontend wrapper. Every call goes through `request<T>()` in `lib/api/client.ts`,
which attaches the Bearer JWT, throws a typed `ApiError`, and maps **HTTP 501 → "Not
implemented yet"** so any future AI hook degrades gracefully. Components never call `fetch`
directly — they call these wrappers and load reads through the `useResource()` hook.

> **Insert here:** code screenshot of `lib/api/specialist.ts` and the 501-mapping branch in
> `lib/api/client.ts`.

## 4.3 Sample Screens

> **Insert here:** the final captured Wellness Specialist screens — Client List, Client Detail
> with the Feedback + Assign-Task modules, Educational Content (with the copyright checkbox),
> the Meal-Plan builder, the Health-Trends/Reports dashboard, and the Announce screen.

---

# 5 Testing

Testing follows the project convention: the **backend** carries an automated smoke suite that
runs without a database (routing, auth guards, the deferred-AI contract); DB-backed endpoints
are verified by **manual integration testing** against the live Supabase project; and the
**frontend** is verified by `npm run build` + `npm run lint` + a manual click-through of every
route. The strategy is **defect-targeted** — each test class is written with the specific
intent of finding a particular class of error (Affective rubric element 2).

## 5.1 Test Data

| Fixture | Value used |
|---------|-----------|
| Wellness Specialist | role `wellness_specialist`, `approval_status` approved, status active |
| Pending specialist | role `wellness_specialist`, status `pending` (must be denied `/specialist/*`) |
| Gym User (client) | role `gym_user`, fitness profile (age 22, 70 kg, goal "weight loss") |
| Client activity | `{workout_type:"run", duration:30, calories_burned:300, source:"manual"}` |
| Client diet | `{meal_time:"lunch", food_item:"chicken rice", calories:600, entry_mode:"detailed"}` |
| Feedback (positive) | `{user_id, notes:"Increase protein; great consistency", plan_updated:false}` → 201 + notification row |
| Wellness task (negative) | `{type:"", due_date:<yesterday>}` → expect **422**, no row written |
| Educational content (negative) | `{permission_confirmed:false}` → expect **422** |
| Health-trend report | `{cohort:"all_gym_users", period:"all_time"}` → 201, aggregates only |
| AI request | `POST /ai/workout-plan {user_id, goal}` → expect **501** |

## 5.2 Acceptance Testing

| Criteria | Fulfilled | Remarks |
|----------|-----------|---------|
| Specialist can review the client roster and per-client activity/diet/progress | ✅ | UC1 |
| Submitting feedback creates a notification for the gym user | ✅ | UC4 (AI plan recalc deferred) |
| Educational content is refused unless copyright is confirmed | ✅ | UC3 — 422 if unconfirmed |
| Assigning a task validates input and rejects past due-dates | ✅ | UC2 — 422 on bad data |
| Post moderation warns/removes/escalates and writes an audit-log row | ✅ | UC5 |
| Health-trend report returns only anonymised aggregates | ✅ | UC6 — no user ids stored/returned |
| Meal-plan builder saves per-client plans (notifies client) and templates | ✅ | jsonb canvas |
| A pending/unapproved specialist is denied `/specialist/*` | ✅ | `require_specialist` → 403 |
| Anonymous requests to `/specialist/*` are rejected | ✅ | 401/403 before any DB access |
| AI endpoints return 501; frontend shows "AI coming soon" | ✅ | By design |

```
Date tested : 18 June 2026
% Complete  : 100% of the Wellness Specialist MVP scope (AI tier deferred by design)
Tested by   : Wong Kai Shen
Verified by : Group 11
```

## 5.3 Test Results

**Automated backend smoke suite** — `python -m pytest tests/test_smoke.py -q`:

```
.............                                                  [100%]
13 passed in 0.03s
```

| # | Test | Result |
|---|------|--------|
| 1 | `test_health` — `/health` returns `{"status":"ok"}` | ✅ pass |
| 2 | `test_openapi_lists_all_subsystems` — incl. `/specialist/feedback` mounted | ✅ pass |
| 3–11 | `test_protected_endpoints_reject_anonymous` (incl. `/specialist/content`) → 401/403 | ✅ pass |
| 12–13 | `test_ai_*_is_deferred` → 501 | ✅ pass |

**Frontend build** — `npm run build` → **BUILD OK**. All Wellness Specialist routes compile;
`/specialist/clients/[id]` renders server-side, the rest prerender; no type/lint errors.

> **Insert here:** screenshots of the pytest run, the `npm run build` output, and the manual
> negative tests (422 validation errors; 403 for a pending specialist).

---

# 6 Conclusion

**Completion of software.** The Wellness Specialist subsystem is delivered end-to-end: UC1–UC6
plus meal-plan authoring and announcements are all implemented against a FastAPI/Supabase
backend and a Next.js frontend. Every use case is either fully realised or, where it depends on
the AI tier (specialist feedback auto-recalculating a plan), deliberately deferred behind a
clean 501 boundary with graceful frontend UX. The backend smoke suite passes 13/13 and the
frontend builds cleanly.

**Software quality assurance.** Quality is enforced at three layers: a defect-targeted
automated smoke suite (auth guards, route contract, deferred-AI), strict server-side input
validation and RBAC (`require_specialist`, 422 on bad task/content data), and platform-level
auditing/notification that share each request's transaction so a partial write is impossible.
Manual integration and negative testing against the live Supabase project covers the DB-backed
specialist endpoints.

**Group collaboration & development journey.** Work was partitioned by actor subsystem —
**Yap Hui Chi** (Gym User), **Wong Kai Shen** (Wellness Specialist + the shared typed API layer,
UI shell/primitives, and the AI/Integration boundary), and **Thee Khai Qin** (Admin) — and
integrated through shared Git feature branches (`Foundation` → `design` → `Fixes`, 70 commits)
merged into `main`. My own contribution is traceable through commits such as
*"Add typed API layer with dev-JWT and 501 contract"*, *"Add UI primitives"*,
*"Add shell (Sidebar, TopBar, Avatar)"*, *"restore specialist clients + meal-plans routes"*,
*"ClientDetail with Feedback (UC3)"*, *"CreateMealPlan builder"*, *"Content screen (UC5)"*, and
the final reconciliation commit *"complete actor flows, fix backend contract defects, clean up
frontend"*. The project moved through a deliberate architectural reset — an early mobile PWA, a
desktop-first responsive shell, and finally a clean Next.js App-Router rebuild — so that one
coherent shell served all three actors.

**Problems encountered & resolutions.**

| Problem | Resolution |
|---------|-----------|
| Early mobile-only PWA did not serve a specialist's data-dense screens on desktop | Pivoted to a desktop-first responsive shell, then a clean App-Router rebuild |
| Supabase pgbouncer rejected reused prepared-statement names on first query | Configured the async engine with `statement_cache_size=0` + uuid-based statement names (`core/database.py`) |
| Newer Supabase projects sign JWTs with asymmetric keys, not the HS256 secret | `_decode_token` now branches on the JWT `kid`/`alg` and verifies via a cached JWKS client |
| Risk of AI work blocking the specialist MVP | Put AI behind a 501 service boundary; the frontend maps 501 → "AI coming soon", so manual specialist flows shipped independently |
| Three subsystems drifting from one backend contract | The final consolidation commit fixed "backend contract defects" and aligned the typed API wrappers |

The two biggest engineering lessons were committing to a clean architectural reset rather than
patching a mis-fitting shell, and isolating volatile dependencies — the AI tier and Supabase's
pooler/JWT quirks — behind explicit boundaries so the Wellness Specialist subsystem stayed
simple, testable, and on schedule.

---

### References

- OneFit SRS v1.0 — `Tut01_PI_TT4L_G11_YAP.HUI.CHI, WONG.KAI.SHEN.pdf`
- OneFit SDS v2.0 — `Proj_PII_TT4L_G11_Yap, Wong, Thee.pdf`
- CSE6214 Project Description (TERM 2610) — TT4L *Digital Fitness Coaching & Activity Tracker*
- Repository: monorepo (`frontend/` Next.js 14, `backend/` FastAPI + Supabase), branch `Fixes`
