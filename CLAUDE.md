# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Monorepo with two deployables:

- `frontend/` — Next.js 14 (App Router) + TypeScript + React 18 + Tailwind CSS. Covers **only the Wellness Specialist + Admin** web surfaces (the earlier PWA/`next-pwa` build serving all three actors from `src/` has been removed). Layout is `app/` (routes), `components/` (`ui/` + `shell/`), `lib/` (`api/` + helpers) — there is no `src/`.
- `backend/` — FastAPI + async SQLAlchemy 2.0 + asyncpg. Supabase (Postgres + Auth + Storage) is the data tier.
- `backend/supabase/migrations/` — SQL is the source of truth for the schema. SQLAlchemy ORM (`backend/app/models/entities.py`) maps onto it and does **not** create tables.
- `docs/` — assignment PDFs (SRS, SDS v2.0). `docs/superpowers/plans/` holds implementation plans.
- The root `README.md` and `TESTING.md` describe the pre-reorg, all-actors layout. They are stale for the frontend; trust `frontend/README.md` and the in-tree files instead.

## Commands

### Frontend (`cd frontend`)

```bash
npm install
npm run dev      # http://localhost:3000 (falls back to 3001/… if taken)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # next lint
```

`.env.local` (copy from `frontend/.env.local.example`):
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
- `NEXT_PUBLIC_DEV_JWT=<supabase access token>` — there is no login screen yet; paste a specialist or admin token to exercise the screens.

### Backend (`cd backend`)

```bash
source env/bin/activate                              # existing venv lives at backend/env/ (not .venv)
pip install -r requirements.txt
pip install -r requirements-dev.txt                  # for tests
cp .env.example .env                                 # fill in Supabase values
uvicorn app.main:app --reload                        # http://localhost:8000, /docs for Swagger

python -m pytest -q                                  # all tests
python -m pytest tests/test_smoke.py -q              # smoke only
python -m pytest tests/test_smoke.py::test_health -q # single test
```

`tests/test_smoke.py` runs without a DB (routing, auth guards, AI-deferred 501 contract). DB-backed endpoints need a real Supabase.

## Architecture

### Frontend → backend contract

- All HTTP goes through `frontend/lib/api/client.ts` (`request<T>`). It attaches `Authorization: Bearer <jwt>` — the token comes from `localStorage["onefit-jwt"]`, falling back to `process.env.NEXT_PUBLIC_DEV_JWT`. It throws a typed `ApiError`, and maps **HTTP 501 → "Not implemented yet"** so callers can render "AI coming soon" UX.
- Per-subsystem call wrappers live next to the client: `lib/api/admin.ts`, `lib/api/specialist.ts`, with shared DTOs in `lib/api/types.ts`. Don't call `fetch` directly from components — add a typed wrapper here.
- `lib/api/useResource.ts` is the standard data-loading hook: `useResource(fn, deps)` returns `{ data, error, loading, setData }`, mapping `ApiError` to a string message. Client screens use it for reads; mutations call the wrappers directly.
- There is **no AuthProvider / RequireAuth / login flow** in this frontend (it was removed with the gym-user surface). Auth is dev-token only via the env var above.

### Frontend shell + screens

- `app/` — App Router routes, one folder per page. Only two actor trees exist: `app/specialist/*` and `app/admin/*`. `app/page.tsx` redirects `/` → `/specialist/clients`. Each tree has its own `layout.tsx` that renders the shared shell with its nav items. See `frontend/README.md` for the full route table.
- `components/shell/` — `Sidebar`, `TopBar`, `Avatar` (the persistent app chrome; a fixed left sidebar, not a responsive breakpoint shell). `components/ui/` — primitives (`Button`, `Badge`, `Chip`, `Label`, `Progress`, `BarChart`, `Hairline`).
- Design tokens live in **`tailwind.config.ts`** (the `colors` palette: `cream`/`charcoal`/`coral`/`warm-red`/`muted`/`good`…, plus `letterSpacing` `label`/`button`) and `app/globals.css` (CSS variables + base styles). Fonts are Inter (`--font-inter`, sans) and EB Garamond (`--font-garamond`, serif), wired in `app/layout.tsx`. Build new screens from these tokens — don't hardcode hex values.

### Backend subsystems (SDD §5.1)

`backend/app/main.py` mounts one router per SDD subsystem:

- `subsystems/auth/` — register, login (proxies Supabase GoTrue), `/auth/me`.
- `subsystems/notifications/` — list + mark-read (UC10).
- `subsystems/gym_user/` — profile, manual plans, activity & diet logs, dashboard, progress + milestones (UC7), scheduling (UC9).
- `subsystems/wellness_specialist/` (`/specialist`) — client roster + detail, client activity/diet/progress reads, educational content, feedback (with notify), and meal plans (`public.meal_plans`).
- `subsystems/admin/` (`/admin`) — user listing + status/role changes (writes to audit log), `/stats` KPIs, `/audit-log`, and `/announcements` (list + create). Status/role changes write to the audit log.
- `subsystems/ai_integration/` — **DEFERRED**: every endpoint returns 501. Frontend already handles this. Manual flows are designed behind a service boundary so AI can drop in without touching actor code.

Platform services: `services/audit.py`, `services/notification.py`. Core: `core/config.py` (settings), `core/database.py` (async engine/session), `core/security.py` (Supabase JWT verify + `require_role(...)` guards: `require_gym_user`, `require_specialist`, `require_admin`).

### Auth model

Supabase Auth issues an access token signed either with the legacy HS256 `SUPABASE_JWT_SECRET` or, on newer projects, with asymmetric keys (ES256/RS256) published via JWKS. `core/security.py:_decode_token` picks the path from the JWT `kid`/`alg` header; the JWKS client is cached via `_jwks_client()`. `supabase_jwt_secret` is optional — projects on the new key system can leave it unset. The decoded token is matched to a row in `public.profiles` (auto-created by the `auth.users` trigger in `0002_rls.sql`) to resolve `role` and `status`. The backend uses the service-role key and **bypasses RLS**; the RLS policies in `0002_rls.sql` are defense-in-depth for any direct client access.

### Supabase pooler quirks

`core/database.py` configures the async engine with `statement_cache_size=0`, `prepared_statement_cache_size=0`, and a uuid-based `prepared_statement_name_func`. This is mandatory when `DATABASE_URL` points at Supabase's pgbouncer (transaction mode), which rejects reused prepared-statement names. Don't remove these flags or first-query operations (e.g. the jsonb codec setup) will raise `DuplicatePreparedStatementError`.

### Database migrations

Apply in order; `0001_init.sql` is all 20 SDD entities, `0002_rls.sql` adds RLS + the profiles trigger, `0003_harden_functions.sql` revokes public RPC execute on the trigger function, `0004_specialist_admin.sql` adds the `public.meal_plans` table (jsonb `payload` canvas) backing the Specialist's CreateMealPlan screen — `client_id` null means a reusable template. The repo notes this schema is already applied to Supabase project `cnsbxqinucvgiqknqwex`.

## Conventions specific to this repo

- **Don't add automated frontend tests.** This is a uni-project deliverable; verification is `npm run build` + `npm run lint` + manual click-through of the routes in `frontend/README.md` against a running backend. Mention this explicitly when asked to "add tests" on the frontend.
- **501 is a feature, not a bug.** AI endpoints intentionally return 501; the frontend renders "AI coming soon". Don't stub them in the backend with fake data.
- **Schema lives in SQL.** Don't add `Base.metadata.create_all` or Alembic — modify the SQL files in `backend/supabase/migrations/` and the ORM mappings together.
