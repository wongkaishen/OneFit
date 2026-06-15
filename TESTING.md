# How to test the OneFit frontend

The **manual testing guide** — click through the app in a browser and verify each screen. No automated tests by design (pragmatic uni-project choice); we verify with `npm run build` + click-through.

OneFit is **one responsive website** for all three actors (Gym User, Wellness Specialist, Admin). Same sidebar shell everywhere — a fixed rail on desktop, a slide-in hamburger drawer on mobile. Desktop-first with a **600px breakpoint**.

---

## 1. Start the dev server

```bash
npm install      # only the first time, or after pulling new code
npm run dev
```

Open whatever URL it prints — usually [http://localhost:3000](http://localhost:3000), but **if port 3000 is taken it falls back to 3001** (or 3002, etc.). Check the terminal.

Stop the server with `Ctrl + C`.

---

## 2. Two ways to test

### Mode A — Demo mode (no backend, fastest) ⭐

Add `?demo=<role>` to any URL. The frontend then **bypasses the backend entirely** and serves realistic seed data, signing you in as a fake user of that role. A **"DEMO MODE"** badge appears bottom-right (with an **Exit** button).

| URL | Signs you in as |
|---|---|
| [localhost:3000/dashboard?demo=1](http://localhost:3000/dashboard?demo=1) or `?demo=gym` | **Gym User** (Alex Tan) |
| [localhost:3000/specialist/clients?demo=specialist](http://localhost:3000/specialist/clients?demo=specialist) | **Wellness Specialist** (Jordan Mills) |
| [localhost:3000/admin/dashboard?demo=admin](http://localhost:3000/admin/dashboard?demo=admin) | **Admin** (Sam Reyes) |
| any URL with `?demo=0` | exits demo mode |

Notes:
- Demo mode + role **persist in localStorage**, so you only need the `?demo=` param once. To **switch actor**, visit a URL with a different `?demo=` value (or click **Exit** on the badge first). If you're signed in as Admin and try a Gym User route, the role guard will bounce you to `/login` — that's correct.
- AI endpoints still return *"coming soon"* in demo mode (they're stubbed everywhere).
- Admin user-management actions (approve/suspend/reinstate) work against the in-memory demo roster and persist until you reload the page.

### Mode B — With Wong's FastAPI running

Start his backend on the `Foundation` branch (port 8000) **in another terminal**:

```bash
# second terminal, on the Foundation branch
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Make sure `.env.local` points at it (copy from `.env.example`):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Now register, log in, save activities, change user statuses, etc. for real. Note: only a subset of Specialist/Admin screens are backed by real endpoints yet (see §6) — the rest show seed data.

---

## 3. Responsive testing (do this for every screen)

Open DevTools → device toolbar (`Cmd + Shift + M` in Chrome) and check **two widths**:

- **Desktop ≥ 1440px** — sidebar rail visible, multi-column layouts (KPI strips, side-by-side panels, data tables).
- **Mobile = 390px** — sidebar collapses; a **☰ hamburger** appears in the top bar. Tapping it slides the nav drawer in over a dimmed backdrop. Multi-column layouts stack to one column; wide data tables (admin users, specialist clients) **scroll horizontally** instead of crushing.

The flip happens at **600px** — drag the window across that width and watch the layout switch.

---

## 4. Per-actor walkthroughs

### Gym User (`?demo=gym`, or register in Mode B)

| Step | Do | Expect |
|---|---|---|
| 1 | Visit `/` with no session | Bounces to `/login` |
| 2 | **Join us** → fill the 3-step register | Auto-signs in, lands on `/dashboard` |
| 3 | `/dashboard` | KPI strip (steps/calories/water) + today's sessions + quick actions |
| 4 | Sidebar **Train** → fill duration → **Save entry** | Posts activity → Milestone screen |
| 5 | Sidebar **Eat** → **+ Add meal** → fill → **Save meal** | Calorie ring updates, meal saved |
| 6 | **Plan** → choose goal + days → **Generate plan ✨** | Health-disclaimer modal appears *first* |
| 7 | **I understand** | "AI coming soon", button becomes **Save plan** → saves manually |
| 8 | **Profile** → edit weight → **Save changes** | "Saved.", BMI recalculates |
| 9 | **Progress** → enter weight → **Save progress** | New entry, weight chart updates |
| 10 | **Schedule** (`/calendar`) | Month grid + "Up next" sessions |
| 11 | Click the avatar (top-right) | Signs out → `/login` |

### Wellness Specialist (`?demo=specialist`)

| Step | Do | Expect |
|---|---|---|
| 1 | `/specialist/clients` | Client roster table with progress bars + alert badges |
| 2 | Click a client row | Client detail: weight-trend bar chart, meal plan, specialist notes |
| 3 | **‹ Back to clients** | Returns to the roster |
| 4 | Sidebar **Plans** (`/specialist/plans`) | Meal-plan builder with day chips + live macro summary |

### Admin (`?demo=admin`)

| Step | Do | Expect |
|---|---|---|
| 1 | `/admin/dashboard` | 4-up KPI strip + recent-activity feed |
| 2 | Sidebar **Users** (`/admin/users`) | Live user list — role, joined date, status badge, email |
| 3 | Click a role chip (Members / Specialists / Admins) | List filters by role |
| 4 | Click a row's **⋯** → **Suspend** / **Approve** / **Reinstate** | Status badge flips (action is contextual to current status) |
| 5 | Tick a few row checkboxes → bar turns dark → **SUSPEND** / **ACTIVATE** | All selected users update at once |
| 6 | Sidebar **Content** (`/admin/content`) | Program cards; filter chips Draft/Published/Archived |

> The **Admin user-management** actions in step 4–5 hit Wong's real API (`PATCH /admin/users/{id}/status`) in Mode B, and the in-memory roster in Mode A.

---

## 5. What to specifically watch for

If any of these fail, it's a bug:

- **Route guards block anonymous & wrong-role access.** With no session, paste `/dashboard` or `/admin/users` → bounce to `/login`. Signed in as one role, try another role's route → bounce.
- **Numeric inputs reject letters.** On register step 3 / `/profile` / `/progress`, type `abc123def` into a number field — only `123` appears. (SRS NFR 5.3)
- **Calorie ring** on `/diet` is a dynamic SVG donut showing intake %. (SRS NFR 5.3)
- **Health-disclaimer modal** appears on the *first* "Generate plan" tap, before any AI request. (SRS NFR 5.6)
- **Hamburger drawer** opens/closes the sidebar below 600px; the backdrop dims the page and closes it on tap.
- **Avatar = sign out** (top-right of any signed-in screen).
- **DEMO MODE badge** (bottom-right) only shows in demo mode and its **Exit** clears the session.

---

## 6. All routes

| URL | Screen | Actor | Backed by real API? |
|---|---|---|---|
| `/` | Role-based redirect | — | — |
| `/login` | Sign in | public | ✅ |
| `/register` | 3-step registration | public | ✅ |
| `/dashboard` | Home | Gym User | ✅ |
| `/activity` | Log activity | Gym User | ✅ |
| `/diet` | Log diet (calorie ring) | Gym User | ✅ |
| `/plan` | Create workout plan | Gym User | ✅ (AI stubbed) |
| `/profile` | Edit fitness profile | Gym User | ✅ |
| `/progress` | Update measurements | Gym User | ✅ |
| `/calendar` | Schedule sessions | Gym User | ✅ |
| `/milestone` | Celebration screen | Gym User | ✅ |
| `/specialist/clients` | Client roster ⇄ detail | Specialist | ⛔ seed data (no endpoint yet) |
| `/specialist/plans` | Meal-plan builder | Specialist | ⛔ seed data (no endpoint yet) |
| `/admin/dashboard` | Admin overview | Admin | ⛔ seed data (no endpoint yet) |
| `/admin/users` | User management | Admin | ✅ `GET /admin/users`, `PATCH .../status` |
| `/admin/content` | Content & programs | Admin | ⛔ seed data (no endpoint yet) |

In **demo mode** every screen has seed data regardless of the last column.

---

## 7. If something breaks

Open DevTools (`Cmd + Option + I` on Mac, `F12` on Windows) → **Console** tab.

| Error | Means | Fix |
|---|---|---|
| `ERR_CONNECTION_REFUSED @ localhost:8000` | Wong's backend isn't running | Start it (Mode B) **or** add `?demo=…` to test without it |
| `404 Not Found` on `/auth/...` | Backend on wrong port | Match terminal port with `NEXT_PUBLIC_API_BASE_URL` in `.env.local` |
| `CORS error` | Backend doesn't allow your origin | Wong adds CORS middleware in FastAPI |
| `Cannot read properties of undefined` | Possible frontend bug | Paste the error to me — I'll add a defensive fix |

---

## 8. Production-build smoke test

Before pushing or deploying:

```bash
npm run build
```

Should end with:

```
✓ Compiled successfully
✓ Generating static pages (19/19)
```

plus a table of route sizes. If any step fails, the deploy will fail too. (The service worker is only generated in this production build, not in `npm run dev`.)

---

## 9. (Optional) Automated browser checks with Playwright

For repeating a flow without clicking by hand:

```bash
npm install -g @playwright/cli@latest

playwright-cli open http://localhost:3000/admin/users?demo=admin
playwright-cli snapshot                 # see refs for elements on the page
playwright-cli resize 390 800           # check mobile layout
playwright-cli click e15                # click an element by ref
playwright-cli screenshot --filename=check.png
playwright-cli close
```

Useful for catching regressions when changing screen code. Optional — not needed for a demo.
