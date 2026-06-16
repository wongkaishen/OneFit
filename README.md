# OneFit Frontend

The OneFit Gym User mobile app — plus draft web dashboards for Wellness Specialists and Admins. Built with Next.js + React, talks to the FastAPI backend over HTTP/JSON.

## Setup

```bash
npm install
cp .env.example .env.local      # edit if backend isn't on localhost:8000
npm run dev                      # http://localhost:3000
```

Start Wong's FastAPI backend in parallel (Foundation branch, port 8000).

## Routes

| Route | Screen |
|---|---|
| `/` | Redirects by role |
| `/login` | Sign in |
| `/register` | 3-step registration |
| `/dashboard` | Gym User home |
| `/activity` | Log activity |
| `/diet` | Log diet (with calorie ring) |
| `/plan` | Create workout plan (AI = "coming soon") |
| `/profile` | Edit fitness profile |
| `/progress` | Update body measurements + chart |
| `/calendar` | Schedule sessions |
| `/milestone` | Celebration screen |

## Demo flow

1. Visit `/register` → step 1 → 2 → 3 → Create account.
2. Lands on `/dashboard`. Tap the avatar (top-right) to sign out.
3. Tap **Train** → `/activity` → fill duration → Save entry → Milestone screen → Share → back to dashboard.
4. Tap **Eat** → `/diet` → "+ Add meal" → fill in → Save.
5. Visit `/plan` → choose goal + days → Generate plan → health-disclaimer modal → "I understand" → "AI coming soon" → Save plan manually.
6. Visit `/profile`, `/progress`, `/calendar` for the rest.

## How the JWT works

`/auth/login` returns a JWT; we store it in `localStorage["onefit-jwt"]` and the client (`src/api/client.ts`) attaches it as `Authorization: Bearer <jwt>` on every request. Refreshing the page calls `/auth/me` to restore the signed-in user.

## Project structure

```
src/
  api/          # typed fetch wrappers for every Wong endpoint
  app/          # Next.js App Router pages
  auth/         # AuthProvider context + RequireAuth guard
  components/   # cross-cutting widgets (TweaksPanel, CalorieRing, HealthDisclaimerModal)
  mobile/       # mobile-only components and screens (phone frame, primitives, 9 screens, TabBar)
  web/          # Wellness Specialist + Admin web screens (drafted, not yet wired into routes)
  styles/       # design tokens + global CSS
```

## See also

- `CLAUDE.md` — full project + design-system rules
- `docs/superpowers/plans/2026-06-14-mobile-gym-user-frontend.md` — the plan this codebase was built from
- `docs/` — the assignment PDFs (SRS + SDS)
