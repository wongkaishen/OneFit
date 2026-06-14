# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

The **FastAPI backend** is scaffolded in `backend/` (auth, all 20 ORM models, Gym User vertical, Specialist/Admin routers, deferred AI stubs). The **database schema** is authored as SQL migrations in `backend/supabase/migrations/`. The **frontend** (Next.js) is not built yet — design is coming after the backend.

The `docs/` folder holds the Software Design Specification (`Proj_PII_TT4L_G11_*.pdf`, v2.0) — **the source of truth** for requirements, the domain model, and architecture. Read the relevant PDF section before building a feature; extract text with `pdftotext -layout "docs/Proj_PII_TT4L_G11_Yap, Wong, Thee .pdf" -`. The data dictionary (§3.2) maps 1:1 to `0001_init.sql`.

Supabase project: **`cnsbxqinucvgiqknqwex`** (name "OneFit", region ap-northeast-1, Postgres 17). Migrations `0001`–`0003` are **applied** — all 20 tables exist with RLS enabled and the security advisor is clean (only intentional INFO notices on backend-only tables). Generated TS types live in `backend/supabase/database.types.ts` (regenerate after schema changes). Apply future migrations via the `plugin:supabase` MCP (OAuth) or the dashboard/CLI. Note the `claude_ai_Supabase_2` MCP is pinned to a different project and cannot target this one.

### Backend commands (run from `backend/`)

```bash
python -m venv .venv && .venv\Scripts\activate     # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                                # fill in Supabase values
uvicorn app.main:app --reload                       # docs at /docs, health at /health
```

Tests: `pip install -r requirements-dev.txt && python -m pytest -q` (from `backend/`). Current suite (`tests/test_smoke.py`) is DB-free — it covers routing, auth guards, and the deferred-AI 501 contract. Add integration tests against a real Supabase as DB-backed endpoints are fleshed out.

## What OneFit is

A web-based digital wellness platform for Gen Z / Gen Alpha that combines fitness tracking, diet/calorie logging, AI-generated workout plans, and mental-resilience content. Three actor roles drive the entire design:

- **Gym User** — register/login, manage fitness profile, AI workout plans, log activity & diet, track/share progress, schedule sessions.
- **Wellness Specialist** (health coach / nutritionist) — review progress, assign wellness tasks, manage educational content, give feedback (which auto-recalculates the user's plan), moderate community groups, review health trends.
- **Admin** — manage/view users, approve registrations, suspend/reinstate memberships, assign roles, monitor activity, remove inactive programs, send announcements.

## Planned tech stack (per SDD §1.3.2, §5.1)

4-tier cloud architecture (presentation / application / data / external):

- **Frontend:** Next.js web app.
- **Backend:** Python / **FastAPI** — routes all sensitive health data between frontend, DB, and AI. **All external credentials (AI, email, nutrition) stay on the backend** — the frontend never calls third-party APIs directly.
- **Data & Auth:** **Supabase** (PostgreSQL) — Email/Password + OAuth, JWT role-based access control, **Row-Level Security**, and Storage (progress photos, educational media).
- **AI inference:** **Groq Cloud** for workout-plan and specialist-feedback generation; **Hugging Face** for pose/model inference. Treated as a Small Language Model accessed via cloud API (or run locally on the backend).
- **Nutrition data:** third-party nutrition API — SDD names USDA FoodData Central (and mentions Edamam/FatSecret as alternatives) for macro/micro-nutrient lookups.

Target scale is ~500 concurrent users.

## Implementation roadmap

The SDD specifies the full system; build it in this order. **The MVP keeps all three actors (Gym User, Wellness Specialist, Admin) but ships them WITHOUT AI** — anywhere the SDD calls for AI, the MVP uses a manual equivalent (see below). AI is a deferred enhancement layered on top of the working manual flows.

**Phase 1 — MVP (build first): all three actors, no AI**
1. **Auth & roles (Supabase)** — register, email verify, login, role-based routing for `gym_user` / `wellness_specialist` / `admin`. Foundation for everything else.
2. **Gym User** — fitness profile (anthropometrics + goals); **manual** workout-plan builder (create/edit plans by hand, no Groq); activity & dietary logging + daily calorie progress widget (manual food/calorie entry, no nutrition API); progress dashboard (weight/body-fat + trend charts).
3. **Wellness Specialist** — review user progress reports; assign wellness tasks; manage educational content (Draft → Published → Archived); provide feedback that **manually** updates the user's plan and notifies them (no AI recalc); community moderation.
4. **Admin** — view/manage users, role assignment, approve registrations, suspend/reinstate memberships, monitor activity, send announcements/notifications.

**Future features (deferred until the MVP works):**
- **AI & Integration subsystem (the headline deferred work):**
  - Groq workout-plan & specialist-feedback generation (replaces the manual plan builder).
  - AI plan **auto-recalculation** when a specialist submits feedback or a profile/progress change is significant (replaces the manual plan update).
  - AI calorie-balance suggestions and health-trend analysis.
  - Hugging Face pose/model inference.
  - Nutrition API lookup (USDA FoodData Central) replacing manual calorie entry.
- Community groups beyond basic moderation; richer educational content; cohort health-trend analytics.
- Social sharing (Instagram/WhatsApp), wearable sync, offline caching/auto-sync, calendar scheduling, notification retry.

**Design the MVP so AI drops in cleanly later:** keep all plan/feedback/recalculation logic behind a service boundary (the AI & Integration subsystem in §5.1) so the manual implementations can be swapped for Groq/HF calls without touching the Gym User, Specialist, or Admin code.

When picking up new work, default to the lowest unfinished Phase 1 item unless told otherwise.

## Subsystem structure (per SDD §5.1)

The system is split by actor-domain into feature subsystems plus two cross-cutting subsystems. Keep this boundary when organizing modules — each maps to one team member's ownership:

- **Gym User Subsystem** — the end-user experience (profile, logging, plans, progress). Primary *consumer* of outputs from the Specialist and AI subsystems.
- **Wellness Specialist Subsystem** — reads/writes health data through FastAPI; RLS restricts each specialist to their assigned users.
- **Admin Subsystem** — platform-wide user/role/program management.
- **AI & Integration Subsystem** — the **only** place that talks to Groq, Hugging Face, and the nutrition API; validates and normalizes every response before returning it to callers. Centralizing this keeps credentials on the backend and isolates provider-specific details.
- **Platform Services (shared)** — Supabase auth (JWT + RBAC), Notification/Realtime (push, in-app, email), Supabase Storage, and audit logging. Every other subsystem depends on these.

## Domain model (per SDD §3)

Core entities to derive the DB schema and service classes from. `User` is the base; `GymUser`, `WellnessSpecialist`, and `Admin` inherit from it (generalisation):

`User` → `GymUser` / `WellnessSpecialist` / `Admin`, plus `FitnessProfile`, `WorkoutPlan`, `WorkoutSession`, `ActivityLog`, `DietaryLog`, `ProgressEntry`, `Milestone`, `WellnessTask`, `EducationalContent`, `Feedback`, `CommunityGroup`, `CommunityPost`, `Notification`, `Announcement`, `HealthTrendReport`, `AuditLog`.

Key relationships: a `GymUser` owns one `FitnessProfile`, has many `WorkoutPlan`s, and receives many `Notification`s. Account status flows `pending → active → suspended` (and `deleted`); roles are `gym_user` / `wellness_specialist` / `admin`. `user_id` is the Supabase Auth UID.

## System rules that cross subsystem boundaries

These are explicit behaviors in the SDD — preserve them when implementing the relevant features:

- **Specialist feedback updates plans.** When a Wellness Specialist submits feedback, the Gym User's workout/meal plan is updated and the user is notified. *MVP:* the specialist edits the plan manually as part of submitting feedback. *Future (AI):* the backend requests a plan recalculation from Groq (feedback + latest body status); on AI failure keep the current plan and queue the recalc (`RecalcQueued`); flag unsafe AI plans (`Flagged`).
- **Profile changes** *(MVP)* simply persist; *(future, AI)* silently recalculate future recommendations on successful save.
- **Significant progress changes** — *(future, AI)* prompt the user to opt into plan regeneration. Milestones unlock achievement badges in the MVP (no AI needed).
- **Educational content** requires a copyright/permission declaration before publish; lifecycle is `Draft → Published → Archived` (archiving sets visibility false but preserves data), with a `Rejected` branch.
- **Community moderation** escalates high-severity posts to Admin; all moderation actions are logged and the member notified.
- **Audit logging** is required for admin actions (role changes, suspend/delete, program removal).

Many use cases specify **offline/failure branches** (e.g. activity logs cache locally and auto-sync; notifications retry on delivery failure) — check the relevant activity/state diagram in the SDD before implementing the happy path only.
