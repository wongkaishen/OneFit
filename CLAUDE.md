# CLAUDE.md

Guidance for Claude Code working in this repository. This is the **`design` branch** — the entire frontend.

## What OneFit is

A university group project (Group 11) — a digital wellness platform with fitness tracking, diet/calorie logging, AI-generated workout plans, and mental-resilience content. Three actor roles:

- **Gym User** — mobile app: register/login, fitness profile, AI workout plans, log activity & diet, track/share progress, schedule sessions.
- **Wellness Specialist** — web dashboard: review progress, assign tasks, manage educational content, give feedback (auto-recalculates user's plan), moderate community groups.
- **Admin** — web panel: manage users, approve registrations, suspend/reinstate memberships, monitor activity, remove inactive programs, send announcements.

## Team & branches

- **Yap Hui Chi** (you) — entire frontend → `design` branch (this one)
- **Wong Kai Shen** — FastAPI backend + AI + Supabase → `Foundation` branch
- **Thee Khai Qin** — Admin subsystem support

The frontend talks **only to Wong's FastAPI**. It does *not* touch Supabase directly.

## Tech stack (design branch)

- **Next.js** (App Router) + React — *currently being migrated from Vite*
- Deploys to **Vercel** (per SDS §5)
- Design system in `src/styles/tokens.css` — warm cream + coral, Inter + EB Garamond, 1px hairlines, no cards, no shadows, sharp corners
- Components: `src/mobile/` (mobile, 390-wide phone frame), `src/web/` (1440-wide desktop)

## Current state

5 of 9 Gym User mobile screens built (Login, Dashboard, Log Activity, Log Diet, Milestone). All 6 web screens drafted (3 Wellness Specialist + 3 Admin). Tweaks panel for font (Inter ↔ EB Garamond) and accent color. All data is hardcoded — no API calls yet.

## Backend API (Wong's, on Foundation branch)

Base URL via env var `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). JWT stored in localStorage, sent as `Authorization: Bearer <jwt>`.

```
/auth
  POST /register     – create account (status = pending)
  POST /login        – returns JWT
  GET  /me           – current user (requires token)

/gym-user
  GET  /profile      PUT /profile        – fitness profile
  GET  /plans        POST /plans         – workout plans (manual)
  POST /activity                         – log activity
  POST /diet                             – log meal (manual calories)
  GET  /dashboard                        – daily summary
  GET  /progress     POST /progress      – progress entries
  GET  /milestones                       – achievement badges
  GET  /sessions     POST /sessions      – workout sessions

/wellness-specialist
  GET  /content      POST /content       – educational content
  POST /feedback                         – submit feedback → updates user's plan

/admin
  GET   /users                           – list users
  PATCH /users/{user_id}/status          – suspend / reinstate / approve

/notifications
  GET    /                               – list mine
  PATCH  /{id}/read                      – mark read

/ai
  POST /workout-plan                     – Groq plan generation (501 stub)
  GET  /nutrition/search                 – USDA lookup        (501 stub)
```

**AI endpoints return 501.** UI catches and shows "AI coming soon" gracefully.

## Frontend rules

- Frontend NEVER calls Supabase. All data flows through Wong's FastAPI.
- Base URL is env var, never hardcoded.
- **No automated tests** — manual click-through verification only (pragmatic uni-project choice).
- **Mobile-first build order:** finish 9 Gym User mobile screens + wire to API before circling back to the web screens.
- Visual rules: cream `#FAF6F0` + charcoal `#1F1D1B`, coral `#E85D4A` for active only, warm-red `#B94838` brand mark only, 1px hairlines, no cards/shadows/rounded corners. EB Garamond reserved for personal/emotional beats (greetings, big numerals, milestone).
- Copy: sentence case + period for headings/body; UPPERCASE tracked for labels/buttons/pills; middots `·` connect attribute lists.

## Follow-ups to revisit after mobile frontend ships

- [ ] **Supabase Realtime push** — frontend doesn't use Supabase JS SDK at all. If we want live notifications instead of polling `/notifications`, add SDK + subscribe to `notifications` table.
- [ ] **Supabase Storage for progress photos** — coordinate with Wong: does `POST /progress` accept multipart, or hand back a signed Supabase upload URL?
- [ ] **AI flows** — swap "coming soon" for real loading + result states when `/ai/*` endpoints come online. Health-disclaimer modal must show on first plan generation (SRS NFR 5.6).
- [ ] **Specialist-feedback → live plan-update toast** — needs Realtime.
- [ ] **Offline activity logging** — SRS UC1.5 alt-flow. IndexedDB queue + auto-sync on reconnect.
- [ ] **Wearable device sync** — Web Bluetooth / Health API.
- [ ] **Admin 2FA challenge screen** — SRS NFR 5.2.
- [ ] **Share Progress branded graphic** — client-side canvas/SVG composer for IG/WhatsApp/community.
- [ ] **30-day account-deletion flow** — privacy requirement.
- [ ] **Vercel deploy** — set `NEXT_PUBLIC_API_BASE_URL` in Vercel env to Wong's deployed FastAPI URL.

## Source documents

- `docs/Tut01_PI_TT4L_G11_*.pdf` — SRS v1.3 (31 pages)
- `docs/Proj_PII_TT4L_G11_*.pdf` — SDS v2.5 (107 pages); interface mockups pp.94–102, data dictionary pp.38–43

## Commands

```bash
npm install          # first time / after pulling new deps
npm run dev          # dev server (Vite :5173, Next.js :3000 after migration)
npm run build        # production build
```
