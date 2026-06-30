# OneFit — Auth (Login/Register) + Gym-User Web App — Design

Date: 2026-06-17
Status: Approved for planning

## Goal

Add real authentication to the OneFit web frontend and build out the full
Gym-User web surface, so all three SDS actors can use the same Next.js app:

- **Shared Login** for every role; redirect by role after sign-in.
- **Register** with a role selector (**Gym User** / **Wellness Specialist**).
- **Admin approval gate**: new accounts are `pending` until an admin approves
  them (SDS Admin UC4). Admins are seeded directly in Supabase — never
  self-registered.
- **Full Gym-User app** (SDS Gym User UC1–UC9) wired to the existing
  `/gym/*` backend.

This is spec-faithful to the SDS v2.0 actor model:
- `User.status` ∈ `pending | active | suspended` (default `pending`).
- Gym User UC1 Register / UC2 Login (validate credentials + role + ban-status →
  role dashboard; "email in use" → route to Login).
- Admin UC4 Approve Member Registration (pending → active).

## Non-goals

- AI endpoints stay deferred (501 → "AI coming soon"). No change.
- No email-verification UX build-out beyond what Supabase already does; we treat
  the admin-approval gate as the activation step for this deliverable.
- No automated frontend tests (per CLAUDE.md). Verification is
  `npm run build` + `npm run lint` + manual/Playwright click-through.
- Specialist certification-document upload (mentioned in UC4) is out of scope;
  approval is a status flip only.

## Architecture overview

```
                         ┌─────────────────────────────────────┐
 Browser  ── /login ───▶ │ POST /auth/login  → token            │
          ── /register ─▶│ POST /auth/register (role param)     │  FastAPI
                         │ GET  /auth/me     → {role,status}    │  (existing,
                         └─────────────────────────────────────┘   + small
                                      │                              register
              token in localStorage["onefit-jwt"]                   change)
                                      │
        ┌───────────── role + status branch ─────────────┐
        ▼                      ▼                          ▼
   /admin/dashboard     /specialist/clients          /gym/dashboard
   (status=active)      (status=active)              (status=active)
                                      │
                      status=pending → "Awaiting approval"
                      status=suspended → "Account suspended"
```

## Frontend changes (`frontend/`)

### 1. Auth API wrapper — `lib/api/auth.ts` (new)

Typed wrappers over `client.ts` (never call `fetch` from components):

```ts
login(email, password): Promise<{ access_token: string; refresh_token?: string }>
register(body: { name; email; password; role }): Promise<unknown>
me(): Promise<CurrentUser>   // { id, user_id, name, email, role, status }
```

`CurrentUser` DTO added to `lib/api/types.ts`. `RegisterRole = "gym_user" |
"wellness_specialist"`.

### 2. Session helper — `lib/auth/session.ts` (new)

- `setToken(t)`, `clearToken()`, `getToken()` over `localStorage["onefit-jwt"]`
  (same key `client.ts` already reads).
- `useSession()` hook: on mount, if a token exists, call `me()`; expose
  `{ user, loading, error }`. No token → `user = null`.
- `roleHome(role)` → `/admin/dashboard` | `/specialist/clients` |
  `/gym/dashboard`.

### 3. Login page — `app/login/page.tsx` (new, public route)

- Email + password form → `auth.login` → `setToken` → `auth.me`.
- Branch on result:
  - `status === "pending"` → inline notice "Your account is awaiting admin
    approval." (token cleared; not redirected).
  - `status === "suspended"` → "Your account has been suspended."
  - else → `router.replace(roleHome(user.role))`.
- Invalid credentials (`ApiError` 400) → "Invalid email or password" (UC2).
- Link to `/register`.

### 4. Register page — `app/register/page.tsx` (new, public route)

- Fields: name, email, password, **role selector** (segmented control:
  Gym User / Wellness Specialist).
- Submit → `auth.register({...})`.
  - Success → success panel: "Account created. An admin will review and approve
    it before you can sign in." + link to `/login`.
  - `email already in use` (GoTrue 4xx) → inline error + "Log in instead" link
    (UC1 exception path).
- No auto-login (account is `pending`, so login would bounce anyway).

### 5. Route guard — `components/shell/AuthGate.tsx` (new) + layout wiring

- Client component: uses `useSession()`. While loading → minimal splash.
  No user → `router.replace("/login")`. Wrong role for the tree → redirect to
  the user's own `roleHome`.
- Wired into `app/admin/layout.tsx`, `app/specialist/layout.tsx`, and the new
  `app/gym/layout.tsx`, each passing its required role.
- `/login` and `/register` remain outside the gate.
- `app/page.tsx`: redirect `/` → `/login` (was `/specialist/clients`).

### 6. TopBar logout

- Add a logout affordance to `components/shell/TopBar` (or Avatar menu):
  `clearToken()` → `router.replace("/login")`. Show signed-in user's name from
  `useSession()` where the chrome currently hardcodes a name.

### 7. Gym-User app — `app/gym/*` (new tree)

New `app/gym/layout.tsx` renders `Sidebar` (role "Gym User", accent coral) +
`AuthGate role="gym_user"`. Nav items map to the screens below. All screens
use existing `ui/` primitives and tokens — no new hardcoded hex.

New API wrapper `lib/api/gym.ts` over the existing endpoints:

| Screen (route)                | UC  | Backend calls |
|-------------------------------|-----|---------------|
| `/gym/dashboard`              | —   | `GET /gym/dashboard` (calorie balance), `GET /gym/plans`, `GET /gym/sessions` (next) |
| `/gym/profile`                | UC4 | `GET/PUT /gym/profile` |
| `/gym/plans` (+ new)          | UC3 | `GET /gym/plans`, `POST /gym/plans` (manual; goal) |
| `/gym/activity`               | UC5 | `POST /gym/activity` + recent list (from dashboard/day) |
| `/gym/diet`                   | UC6 | `POST /gym/diet` + recent list |
| `/gym/progress`               | UC7 | `GET/POST /gym/progress`, `GET /gym/milestones` |
| `/gym/calendar`               | UC9 | `GET /gym/sessions`, `POST /gym/sessions` (409 conflict → "pick another slot") |

Reads use `useResource`; mutations call the wrapper then refresh. The
dashboard shows a calorie ring/summary (consumed vs burned) built from the
`/gym/dashboard` payload. "Share progress" (UC8) is represented as a simple
share/export affordance on the progress screen (no external posting).

DTOs for plans/logs/progress/sessions/profile added to `lib/api/types.ts`,
matching the Pydantic models in `backend/app/subsystems/gym_user/router.py`.

### 8. Admin approval queue (UC4) — extend `app/admin/users/page.tsx`

- Add a **Pending** quick-filter (uses `listUsers` + client filter, or
  `GET /admin/users?status_filter=pending`).
- Per pending row: **Approve** (`setUserStatus(id,"active")`) and **Reject**
  (`setUserStatus(id,"suspended")`) — both already audited server-side.
- No backend change; wrappers `setUserStatus` already exist.

## Backend changes (`backend/`)

### `POST /auth/register` — accept role (small change)

`backend/app/subsystems/auth/router.py`:

- `RegisterRequest` gains `role: Literal["gym_user","wellness_specialist"] =
  "gym_user"`. Reject `admin` (422) — admins are seed-only.
- Pass `role` into the GoTrue signup `data` (the `on_auth_user_created` trigger
  already maps `raw_user_meta_data->>'role'` into `profiles.role`; status stays
  `pending` by default).
- Provision the correct subtype row:
  - `gym_user` → `gym_users` + `fitness_profiles` (current behavior).
  - `wellness_specialist` → `wellness_specialists` (insert `on conflict do
    nothing`; `approval_status` default `pending`).
- Keep the existing 500-safety: subtype insert failures shouldn't 500 the whole
  signup — wrap subtype provisioning so a confirmed auth user isn't orphaned by
  a secondary insert error. (Investigate the current 500 seen during testing and
  make register resilient.)

No other backend change. `/gym/*`, `/admin/*`, `/auth/login`, `/auth/me` are
used as-is. `require_gym_user` already guards the gym routes; with the approval
gate, `pending` users can't reach a usable dashboard because login blocks them.

### Status semantics check

`require_role` guards resolve role from `profiles`; they do not currently reject
`pending`/`suspended` at the API layer (login is the gate). That's acceptable for
this deliverable: the frontend blocks pending/suspended at login and the guard
still enforces *role*. (Optional hardening — reject non-active in
`get_current_user` — is noted but out of scope unless requested.)

## Data flow: register → approve → login

1. User registers (role chosen) → GoTrue user + `profiles` row `pending` +
   subtype row.
2. User tries to log in → `/auth/me` returns `status=pending` → blocked with
   "awaiting approval".
3. Admin (seeded) opens `/admin/users` → Pending filter → Approve → status
   `active` (audited).
4. User logs in → redirected to their role home → full app.

## Error handling

- Login: 400 → "Invalid email or password"; pending/suspended → status notices.
- Register: GoTrue "email in use" → inline + login link; weak password / invalid
  email → surfaced from `ApiError.message`.
- Gym calendar: 409 → "That time slot is taken — pick another."
- All API errors flow through `ApiError`; 501 still → "coming soon".

## Testing / verification (no automated FE tests)

- `cd frontend && npm run build && npm run lint`.
- Backend: `cd backend && python -m pytest tests/test_smoke.py -q` (register
  contract); manual register/login against live Supabase.
- Playwright click-through: register (both roles) → see pending → seed/admin
  approves → login → land on correct dashboard → exercise gym screens.
- Admin account seeded directly in Supabase by the user (out of app scope).

## File-change summary

New (frontend):
- `lib/api/auth.ts`, `lib/api/gym.ts`
- `lib/auth/session.ts`
- `app/login/page.tsx`, `app/register/page.tsx`
- `app/gym/layout.tsx` + `app/gym/{dashboard,profile,plans,activity,diet,progress,calendar}/page.tsx`
- `components/shell/AuthGate.tsx`

Modified (frontend):
- `lib/api/types.ts` (CurrentUser + gym DTOs)
- `app/page.tsx` (→ /login), `app/admin/layout.tsx`, `app/specialist/layout.tsx`
  (AuthGate), `components/shell/TopBar.tsx` (logout + name)
- `app/admin/users/page.tsx` (pending filter + approve/reject)

Modified (backend):
- `app/subsystems/auth/router.py` (role param + resilient subtype provisioning)

Out of scope: AI, cert-doc upload, community groups, gym-user mobile parity
beyond UC1–UC9 listed above.
