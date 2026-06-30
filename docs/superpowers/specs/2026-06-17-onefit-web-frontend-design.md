# OneFit Web Frontend — Design Spec

**Date:** 2026-06-17
**Status:** Approved (pending spec review)
**Scope:** Recreate the OneFit **web** surfaces (Wellness Specialist + Admin) as a Next.js app in `/frontend`, wired to the existing FastAPI/Supabase backend.

---

## 1. Goal & scope

Build a real Next.js web app that recreates the `Web design/ui_kits/onefit-web` reference kit, realigned to the SRS, and wired to live backend data.

**In scope** — the two desktop actor surfaces:

- **Wellness Specialist:** ClientList, ClientDetail (+ Feedback module), CreateMealPlan, Content, Reports.
- **Admin:** AdminDashboard, UserManagement, Announcements.

**Out of scope (this task):**

- **Gym User** (the `onefit-app` mobile kit, SRS UC1–10) — a separate mobile surface, not part of "web only."
- **Auth/login screens** — deferred; a dev JWT is used instead (see §5).
- SRS use cases with **no backend**: UC4 Assign Wellness Tasks, UC6 Monitor Community Groups, Admin "remove inactive programs." Documented as deferred; nav may show stubs but no screens are built.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Data | Wire to existing FastAPI/Supabase backend |
| Layout | Fluid desktop (240px sidebar + flexible content; target ≥1024px) |
| Styling | Tailwind CSS, theme ported from `colors_and_type.css` |
| Auth | Dev JWT via `NEXT_PUBLIC_DEV_JWT` / `localStorage["onefit-jwt"]`; no login page |
| Missing specialist endpoints | Restore the orphaned `clients` + `meal-plans` routes into the active backend router |
| SRS scope | Reference kit + close SRS gaps (Feedback module, Reports, Announcements; Content moved to Specialist) |
| Meal-plan builder | Keep as specialist-authored tool writing to `meal_plans` (migration 0004) |

## 3. Tech stack & project layout

Next.js 14 (App Router) + TypeScript + React 18 + Tailwind CSS. Fonts via `next/font` (Inter, EB Garamond).

```
frontend/
  app/
    layout.tsx                       # fonts, <body>, globals
    page.tsx                         # redirect → /specialist/clients
    specialist/
      layout.tsx                     # specialist WebShell (nav + accent=coral)
      clients/page.tsx               # ClientList
      clients/[id]/page.tsx          # ClientDetail + Feedback module
      plans/new/page.tsx             # CreateMealPlan
      content/page.tsx               # Content (educational content)
      reports/page.tsx               # Reports / Health Trends
    admin/
      layout.tsx                     # admin WebShell (nav + accent=charcoal)
      dashboard/page.tsx             # AdminDashboard
      users/page.tsx                 # UserManagement
      announcements/page.tsx         # Announcements
  components/
    shell/      WebShell, Sidebar, TopBar, Avatar
    ui/         Button, Chip, Badge, Progress, BarChart, Label, Hairline
  lib/
    api/        client.ts, specialist.ts, admin.ts, types.ts
  tailwind.config.ts
  app/globals.css                    # @tailwind + token CSS variables
  .env.local.example
```

App Router **route groups** give Specialist and Admin separate layouts (different sidebar nav + active-marker accent).

## 4. Styling — Tailwind theme from tokens

Port `colors_and_type.css` into `tailwind.config.ts`:

- **Colors:** `cream #FAF6F0`, `charcoal #1F1D1B`, `charcoal-deep #2D2A26`, `warm-red #B94838` (brand mark only), `coral #E85D4A` (CTAs + active markers), `muted #8A857D`, `subtle #5C5852`, `border #D8D0C2`, `white`.
- **Type scale / weights / letter-spacing:** mirror the `--t-*`, `--w-*`, `--ls-*` tokens.
- **Fonts:** Inter (sans, all body/labels/data), EB Garamond (serif) **only** for client names, greetings, big numerals — never body/labels/buttons.

The `.t-*` semantic classes and `W*` primitives become small React components composing Tailwind utilities. CSS variables for the raw tokens live in `globals.css` so primitives can reference them where utilities are awkward. **Coral discipline:** coral is reserved for primary CTAs and the active nav marker; Admin uses a charcoal nav accent (no coral celebration on desktop).

## 5. API layer + auth

`lib/api/client.ts` — `request<T>(path, init)`:

- Base URL from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`).
- Attaches `Authorization: Bearer <jwt>` where jwt = `localStorage["onefit-jwt"]` ?? `NEXT_PUBLIC_DEV_JWT`.
- Throws typed `ApiError { status, message }`.
- Maps **HTTP 501 → "Not implemented yet"** (AI-deferred contract).

`lib/api/specialist.ts` + `admin.ts` — typed wrappers per endpoint. `lib/api/types.ts` — TS mirrors of the backend Pydantic models (`ClientSummary`, `MealPlanOut/In`, `UserOut`, `AdminStats`, `AuditEntry`, `AnnouncementOut/In`, `ContentOut/In`, `FeedbackIn`).

To test against the live backend: paste a Supabase access token into `frontend/.env.local` as `NEXT_PUBLIC_DEV_JWT`. The API layer never needs to change when a real login is added later.

## 6. Screen specs & endpoint wiring

### Wellness Specialist (nav: Clients · Plans · Content · Reports)

**6.1 ClientList** — `/specialist/clients`
`GET /specialist/clients` → `ClientSummary[]`. Roster table (Client, Last active, Current goal, Progress, Alerts) + filter chips (All / On track / At risk / New this week) + serif greeting. "Progress %" and "Alerts" are **derived client-side** from `last_active_at` + `goal` (no exact backend field) — documented as heuristic. Row click → ClientDetail. "+ Add client" is a no-op placeholder (registration is the gym-user/admin flow).

**6.2 ClientDetail + Feedback module** — `/specialist/clients/[id]` (SRS UC3, UC7)
- `GET /specialist/clients/{id}` → header (name, goal, status).
- `GET /specialist/clients/{id}/progress` → weight-trend bar chart.
- `GET /specialist/clients/{id}/activity` → recent activity list.
- `GET /specialist/clients/{id}/diet` → meal/macro summary (middle column).
- **Feedback module** (UC3): the "Send message / Update plan" area becomes a real form → `POST /specialist/feedback { user_id, notes, plan_updated }`. On success show confirmation (backend notifies the gym user). Per SRS NFR, draft text persists in `localStorage` so a reload doesn't lose work.

**6.3 CreateMealPlan** — `/specialist/plans/new`
`GET /specialist/meal-plans` (list), `POST /specialist/meal-plans` (create). Day-tab builder (Mon–Sun) with meal sections + live macro rail. The day/meal canvas serializes to the `payload` jsonb. "Save draft" = `client_id: null` (template); "Publish plan" requires selecting a client → `client_id` set (backend notifies them). Macro totals computed client-side from entered items.

**6.4 Content** — `/specialist/content` (SRS UC5, moved from Admin)
`GET /specialist/content` (list cards by status), `POST /specialist/content { title, body, category, media_url?, permission_confirmed }`. Filter chips by status. "+ Create" opens a form; `permission_confirmed` checkbox satisfies the SRS "Content Validity" assumption. Card grid reuses the reference `ProgramCard` styling; "enrolled" counts have no backend source and are omitted (status badge only).

**6.5 Reports / Health Trends** — `/specialist/reports` (SRS UC7)
Aggregates `GET /specialist/clients` + per-client `/progress` into weight/calorie/progress trend charts across the roster. Empty-state when insufficient data (SRS UC7 alt flow). Read-only in this scope.

### Admin (nav: Dashboard · Users · Announcements)

**6.6 AdminDashboard** — `/admin/dashboard`
`GET /admin/stats` → 4 KPI cards mapped to **real** `AdminStats` fields: Total users (`total_users`), Wellness specialists (`total_specialists`), Active today (`active_today`), Pending approvals (`pending_approvals`). The reference's "System health 99.9%" card is replaced — no backend source, and a fabricated uptime metric would be misleading. `GET /admin/audit-log` → "Recent activity" feed (`AuditEntry`). Utilitarian, charcoal accent, no coral fills except CTAs.

**6.7 UserManagement** — `/admin/users` (SRS UC3)
`GET /admin/users` → `UserOut[]`. Sortable table + role filter chips + selection + bulk bar + per-row menu. Actions: Suspend/Activate → `PATCH /admin/users/{id}/status`; role change / approve specialist → `PATCH /admin/users/{id}/role`. Both write to the audit log (backend). "Accidental lockout" (last admin) errors surface via `ApiError`.

**6.8 Announcements** — `/admin/announcements` (new)
`GET /admin/announcements` → list (`AnnouncementOut`). "+ New announcement" form → `POST /admin/announcements { title, body, target_audience }` (audience validated against backend's allowed set). Confirmation on success.

## 7. Backend change

Restore the orphaned specialist routes so the 3 specialist screens have live data:

1. Move the `ClientSummary`, `MealPlanIn/Out` schemas and the `clients`, `clients/{id}/activity|diet|progress`, `meal-plans` handlers from `app/subsystems/wellness_specialist/router.py 19-23-50-863.py` into the active `app/subsystems/wellness_specialist/router.py`.
2. Verify imports/deps (`MealPlan` model, `SpecialistDep`, `DbDep`, `select`, `func`, entity imports).
3. Delete the orphaned `…19-23-50-863.py` duplicate.
4. Smoke-check: `python -m pytest tests/test_smoke.py -q` (routing/auth guards), then manual hit of `/specialist/clients` with a specialist JWT.

`meal_plans` table already exists (migration `0004`). No schema change needed.

## 8. Verification

- `cd frontend && npm run build` succeeds (per repo convention — no automated frontend tests).
- `npm run lint` clean.
- Manual click-through per the route table above against a running backend with a dev JWT: each screen loads live data; Feedback/Content/Announcement/MealPlan POSTs succeed; UserManagement PATCHes reflect + audit.
- Backend: `pytest tests/test_smoke.py -q` still green after route restore.

## 9. Open items / explicitly deferred

- UC4 Assign Wellness Tasks — no backend; deferred.
- UC6 Monitor Community Groups — `CommunityGroup` entity exists, no router/table wiring; deferred.
- Admin "remove inactive programs" — no `Program` router; deferred.
- Real login + role-based routing — deferred (dev JWT for now).
- ClientList progress/alerts heuristics — client-side derivation until backend exposes a progress field.
