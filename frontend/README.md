# OneFit Web (Specialist + Admin)

Next.js 14 web app for the OneFit Wellness Specialist and Admin surfaces, wired to the FastAPI/Supabase backend.

## Setup

```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_DEV_JWT to a Supabase access token
npm run dev                        # http://localhost:3000
```

`/` redirects to `/specialist/clients`. The Admin surface is under `/admin/*`.

## Auth (dev)

No login screen yet. The API layer reads the JWT from `localStorage["onefit-jwt"]`, falling back to `NEXT_PUBLIC_DEV_JWT`. Paste a specialist or admin Supabase access token to exercise the screens.

## Routes

| Route | Screen |
|---|---|
| `/specialist/clients` | Client roster |
| `/specialist/clients/[id]` | Client detail + feedback (UC3) |
| `/specialist/plans/new` | Meal-plan builder |
| `/specialist/content` | Educational content (UC5) |
| `/specialist/reports` | Health trends (UC7) |
| `/admin/dashboard` | KPI overview + audit feed |
| `/admin/users` | User management (UC3) |
| `/admin/announcements` | Announcements |

## Verify

`npm run build` and `npm run lint`. No automated tests (per repo convention) — click through the routes against a running backend.
