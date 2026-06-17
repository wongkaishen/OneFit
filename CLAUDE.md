# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Monorepo with two deployables:

- `frontend/` — Next.js 14 (App Router) + TypeScript + React 18. PWA via `next-pwa`. One responsive web app for all three actors.
- `backend/` — FastAPI + async SQLAlchemy 2.0 + asyncpg. Supabase (Postgres + Auth + Storage) is the data tier.
- `backend/supabase/migrations/` — SQL is the source of truth for the schema. SQLAlchemy ORM (`backend/app/models/entities.py`) maps onto it and does **not** create tables.
- `docs/` — assignment PDFs (SRS, SDS v2.0). `docs/superpowers/plans/` holds implementation plans.
- The root `README.md` describes the pre-reorg layout (when frontend lived at root). Trust `TESTING.md` and the in-tree files instead.

## Commands

### Frontend (`cd frontend`)

```bash
npm install
npm run dev      # http://localhost:3000 (falls back to 3001/… if taken)
npm run build    # production build; also generates the service worker
npm run lint     # next lint
```

`.env.local` (copy from `frontend/.env.example`): `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.

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

- All HTTP goes through `frontend/src/api/client.ts` (`request<T>`). It attaches `Authorization: Bearer <jwt>` (from `localStorage["onefit-jwt"]`), throws a typed `ApiError`, and maps **HTTP 501 → "Not implemented yet"** — callers catch this to render "AI coming soon" UX.
- Auth state lives in `frontend/src/auth/AuthProvider.tsx`. On mount it calls `/auth/me` to restore the session. `RequireAuth` is the route guard.

### Frontend shell + screens

- One responsive shell with a **600px breakpoint**: fixed sidebar rail ≥ 600px, hamburger drawer below. Same shell for all three actors.
- `frontend/src/app/` — Next.js App Router pages, one folder per route (see `TESTING.md` §6 for the full route table).
- `frontend/src/mobile/` — phone-frame components and Gym User screens (`.jsx`). `frontend/src/web/` — Specialist + Admin screens (`.jsx`). App-router pages in `src/app/` are thin TS wrappers that render these screens.
- `frontend/src/styles/` — shared CSS: `tokens.css` (design tokens / CSS variables) and `app.css` (global app styles). Imported once from the root layout; per-screen styling builds on these tokens.
- Role-based routing: `/` redirects per `user.role` (`gym_user` → `/dashboard`, `wellness_specialist` → `/specialist/clients`, `admin` → `/admin/dashboard`). Cross-role access bounces to `/login`.

### Backend subsystems (SDD §5.1)

`backend/app/main.py` mounts one router per SDD subsystem:

- `subsystems/auth/` — register, login (proxies Supabase GoTrue), `/auth/me`.
- `subsystems/notifications/` — list + mark-read (UC10).
- `subsystems/gym_user/` — profile, manual plans, activity & diet logs, dashboard, progress + milestones (UC7), scheduling (UC9).
- `subsystems/wellness_specialist/` — educational content, feedback (with notify).
- `subsystems/admin/` — user listing + status changes (writes to audit log).
- `subsystems/ai_integration/` — **DEFERRED**: every endpoint returns 501. Frontend already handles this. Manual flows are designed behind a service boundary so AI can drop in without touching actor code.

Platform services: `services/audit.py`, `services/notification.py`. Core: `core/config.py` (settings), `core/database.py` (async engine/session), `core/security.py` (Supabase JWT verify + `require_role(...)` guards: `require_gym_user`, `require_specialist`, `require_admin`).

### Auth model

Supabase Auth issues an access token signed either with the legacy HS256 `SUPABASE_JWT_SECRET` or, on newer projects, with asymmetric keys (ES256/RS256) published via JWKS. `core/security.py:_decode_token` picks the path from the JWT `kid`/`alg` header; the JWKS client is cached via `_jwks_client()`. `supabase_jwt_secret` is optional — projects on the new key system can leave it unset. The decoded token is matched to a row in `public.profiles` (auto-created by the `auth.users` trigger in `0002_rls.sql`) to resolve `role` and `status`. The backend uses the service-role key and **bypasses RLS**; the RLS policies in `0002_rls.sql` are defense-in-depth for any direct client access.

### Supabase pooler quirks

`core/database.py` configures the async engine with `statement_cache_size=0`, `prepared_statement_cache_size=0`, and a uuid-based `prepared_statement_name_func`. This is mandatory when `DATABASE_URL` points at Supabase's pgbouncer (transaction mode), which rejects reused prepared-statement names. Don't remove these flags or first-query operations (e.g. the jsonb codec setup) will raise `DuplicatePreparedStatementError`.

### Database migrations

Apply in order; `0001_init.sql` is all 20 SDD entities, `0002_rls.sql` adds RLS + the profiles trigger, `0003_harden_functions.sql` revokes public RPC execute on the trigger function. The repo notes this schema is already applied to Supabase project `cnsbxqinucvgiqknqwex`.

## Conventions specific to this repo

- **Don't add automated frontend tests.** This is a uni-project deliverable; verification is `npm run build` + manual click-through per `TESTING.md`. Mention this explicitly when asked to "add tests" on the frontend.
- **501 is a feature, not a bug.** AI endpoints intentionally return 501; the frontend renders "AI coming soon". Don't stub them in the backend with fake data.
- **Schema lives in SQL.** Don't add `Base.metadata.create_all` or Alembic — modify the SQL files in `backend/supabase/migrations/` and the ORM mappings together.
