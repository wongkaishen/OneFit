# OneFit Backend (FastAPI)

Application tier for the OneFit digital wellness platform, per the Software
Design Specification (SDD v2.0) in `../docs`. It mediates all traffic between the
Next.js frontend, Supabase (PostgreSQL + Auth + Storage), and — in a future
phase — the AI providers (Groq / Hugging Face / USDA FoodData Central).

## Stack

- **FastAPI** + Uvicorn (async)
- **SQLAlchemy 2.0** (async, asyncpg) — ORM models in `app/models`
- **Supabase**: Auth (GoTrue, proxied), PostgreSQL, Storage
- Auth: Supabase JWT (HS256) verified in `app/core/security.py`

## Layout (mirrors SDD §5.1 subsystems)

```
app/
  core/         config, async DB engine, JWT auth + role guards
  models/       SQLAlchemy ORM for all 20 SDD entities
  services/     Platform Services: audit log, notifications
  subsystems/
    auth/                 register / login (proxies Supabase GoTrue) / me
    notifications/        list + mark-read for any authenticated user (UC10)
    gym_user/             profile, manual plans, activity & diet logging,
                          dashboard, progress + milestones (UC7), scheduling (UC9)
    wellness_specialist/  educational content, feedback (+ notify)
    admin/                user listing & status management (+ audit)
    ai_integration/       DEFERRED — Groq/HF/USDA stubs (501)
supabase/migrations/      0001_init.sql (schema), 0002_rls.sql (RLS + auth trigger)
```

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env              # then fill in the Supabase values
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs, health check at `/health`.

### Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

`tests/test_smoke.py` runs without a database (routing, auth guards, deferred-AI
501 contract). Add integration tests against a real Supabase for DB-backed endpoints.

### Required env (`.env`)

See `.env.example`. You need the Supabase project URL, anon key, service-role
key, JWT secret, and an async `DATABASE_URL`
(`postgresql+asyncpg://...pooler.supabase.com:6543/postgres`).

## Database schema

The schema is authored as SQL and lives in `supabase/migrations/`. It is the
source of truth — the ORM models map onto it (SQLAlchemy does not create tables).
**Already applied to project `cnsbxqinucvgiqknqwex`** (via the Supabase MCP):

- `0001_init.sql` — all 20 entities from SDD §3.2.
- `0002_rls.sql` — Row-Level Security policies + the `auth.users` → `profiles`
  trigger. The backend uses the service-role key and bypasses RLS; policies are
  defense-in-depth for any direct client access.
- `0003_harden_functions.sql` — revokes public RPC execute on the trigger
  function and drops the unused role helper (clears security-advisor warnings).

Generated TypeScript types: `supabase/database.types.ts` (for the Next.js client).

## Roadmap

MVP keeps all three actors (Gym User, Wellness Specialist, Admin) **without AI**.
The AI & Integration subsystem (Groq plan/feedback generation, HF inference, USDA
nutrition) is deferred — see the root `CLAUDE.md` roadmap. Manual flows are
designed behind a service boundary so AI drops in without touching the actor code.
