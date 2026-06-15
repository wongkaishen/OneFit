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

- **Next.js 14** (App Router) + React 18 + TypeScript. Migrated off Vite.
- **PWA**: `next-pwa` service worker, `public/manifest.json`, app icons (`public/icon*.png`/`.svg`), theme color `#B94838`. Installable + offline.
- Deploys to **Vercel** (per SDS §5).
- Design system in `src/styles/tokens.css` — warm cream + coral, Inter + EB Garamond, 1px hairlines, no cards, no shadows, sharp corners.

## Architecture — responsive web app (READ THIS)

**Big pivot (2026-06-15):** this is NOT a phone-only app anymore. It is **one consistent, desktop-first responsive website** for all three actors (Gym User included). Decisions the user locked:

- **Consistent sidebar shell for every actor** — the same `WebShell` the Wellness Specialist / Admin dashboards use. `src/web/WebShell.jsx` is now responsive: fixed sidebar rail on desktop, slide-in hamburger drawer below **600px** (the breakpoint). CSS lives in `src/styles/app.css` (`.ws-*` classes).
- **Desktop-first, 600px breakpoint.** Default styles = desktop; `@media (max-width: 600px)` collapses to mobile (single column, drawer nav).
- **Multi-column desktop layouts** that stack to one column on mobile. Utilities in `app.css`: `.og-kpi` (3-col stat strip → stacked), `.og-cols` (1.4fr/1fr), `.og-cols-even` (1fr/1fr).
- **`src/web/GymShell.jsx`** wraps `WebShell` for the Gym User: nav `Home/Train/Eat/Progress/Plan/Schedule/Profile` → routes, coral accent, role "Gym User", avatar = sign out.
- Gym User screens still live in `src/mobile/screens/*.jsx` (kept the folder name) but each now renders `<GymShell>` and reuses `src/web/WebPrimitives.jsx` (WButton/WChip/WBadge/WProgress/WBarChart/WLabel) — same visual language as Specialist/Admin. **No new design language; reuse WebPrimitives.**
- **Login / Register / Milestone** intentionally use `src/mobile/MobileShell.tsx` (centered column, no sidebar) — pre-auth pages + the celebration moment.

## Current state (2026-06-15)

All 9 Gym User screens are wired to Wong's API + converted to the responsive web shell:
- **Dashboard** (flagship): KPI strip + Today/Quick-actions, multi-column.
- **Train / Eat / Progress / Plan / Profile / Schedule**: GymShell, multi-column desktop → stacked mobile.
- **Login / Register / Milestone**: centered, no sidebar.
- Auth (`src/auth/`): `AuthProvider` (JWT in localStorage, `/auth/me` on load), `RequireAuth` role guard, role-based landing redirect in `src/app/page.tsx`.
- **Demo mode**: visit any URL with `?demo=1` → bypasses backend, signs in as a fake gym user with seed data (`src/api/demo.ts`). A "DEMO MODE" badge (bottom-right, `src/components/DemoBadge.tsx`) shows + lets you exit. Use this to preview without Wong's backend running.

**NOT done yet — next up:**
1. Wire the 3 Wellness Specialist screens (`src/web/screens/Client*.jsx`, `CreateMealPlan.jsx`) into `/specialist/*` routes (+ `RequireAuth role="wellness_specialist"`).
2. Wire the 3 Admin screens (`src/web/screens/Admin*.jsx`, `UserManagement.jsx`, `ContentPrograms.jsx`) into `/admin/*` routes.
3. Make their table / fixed-grid content responsive (the shell already is).
4. Playwright smoke test all screens at desktop + mobile.

## Key files

- `src/web/WebShell.jsx` — responsive sidebar shell (all actors)
- `src/web/GymShell.jsx` — Gym User wrapper around WebShell
- `src/web/WebPrimitives.jsx` — shared desktop components
- `src/mobile/screens/*.jsx` — the 9 Gym User screens
- `src/web/screens/*.jsx` — 6 Specialist/Admin screens (built, NOT yet routed)
- `src/api/` — `client.ts` (fetch+JWT+demo), `auth.ts`, `gymUser.ts`, `notifications.ts`, `ai.ts`, `types.ts`, `demo.ts`
- `src/auth/` — `AuthProvider.tsx`, `useAuth.ts`, `RequireAuth.tsx`
- `src/styles/` — `tokens.css` (design tokens), `app.css` (shell + responsive utilities)
- `docs/superpowers/plans/2026-06-14-mobile-gym-user-frontend.md` — the original (now partly superseded) plan

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
- **No automated tests** — manual click-through verification only (pragmatic uni-project choice). Verify with `npm run build` + Playwright (`playwright-cli`) screenshots at desktop (1440) and mobile (390).
- **Responsive, desktop-first, 600px breakpoint.** Every actor uses the same sidebar shell. Reuse `WebShell` / `GymShell` / `WebPrimitives` — do not reintroduce the phone frame.
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
npm run dev          # dev server → http://localhost:3000 (falls back to :3001 if busy)
npm run build        # production build (service worker only built here, not in dev)
```

Preview without the backend: open `http://localhost:3000/dashboard?demo=1` (demo mode).
