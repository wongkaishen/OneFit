# How to test the OneFit frontend

This is the **manual testing guide** — click through the app yourself in a browser and verify each screen. We don't have automated tests by design (pragmatic uni-project choice).

---

## 1. Start the dev server

```bash
npm install      # only the first time, or after pulling new code
npm run dev
```

Open whatever URL it prints — usually [http://localhost:3000](http://localhost:3000), but **if port 3000 is taken it falls back to 3001** (or 3002, etc.). Look at the terminal output to see.

To stop the server: press `Ctrl + C` in the terminal.

---

## 2. Two testing modes

### Mode A — without the backend (fastest)

The frontend works on its own; only screens that *save* or *load* data need the backend. Without it you can still verify:

- Visual layout of every screen
- Form validation (numeric fields, multi-step register)
- Navigation between routes
- Route guards (anonymous users get bounced to `/login`)
- Tweaks panel (font + accent toggle)

Save/load buttons will show inline errors like *"Registration failed"* — that's expected and proves the wire-up works.

### Mode B — with Wong's FastAPI running

Start his backend on the `Foundation` branch (port 8000) **in another terminal**:

```bash
# in a second terminal, on the Foundation branch
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Now you can register, log in, save activities, etc. for real.

---

## 3. The full demo flow (Mode B, ~5 min)

| Step | Do | Expect |
|---|---|---|
| 1 | Visit `/` | Bounces to `/login` (no JWT yet) |
| 2 | Click **Join us** | Lands on `/register` Step 1 of 3 |
| 3 | Fill email + password → **Continue →** | Step 2 of 3, progress bar fills more |
| 4 | Fill name / DOB / gender → **Continue →** | Step 3 of 3, button reads *"Create account →"* |
| 5 | Fill height + weight → **Create account →** | Auto-signs you in, lands on `/dashboard` |
| 6 | Tap the avatar circle (top-right) | Signs out, returns to `/login` |
| 7 | Log back in | Returns to `/dashboard`, refresh keeps you signed in |
| 8 | Bottom tab **Train** → fill duration → **Save entry** | Posts activity, lands on Milestone screen |
| 9 | **Share the win** (Milestone button) | Returns to `/dashboard` |
| 10 | Bottom tab **Eat** → **+ Add meal** → fill → **Save meal** | Form collapses, meal saved |
| 11 | Visit `/plan` → choose goal + training days → **Generate plan ✨** | Health-disclaimer modal slides up |
| 12 | Click **I understand** | "AI coming soon" message, button becomes **Save plan** |
| 13 | Click **Save plan** | Plan saved manually, returns to dashboard |
| 14 | Visit `/profile` → edit weight → **Save changes** | "Saved." appears, BMI recalculates |
| 15 | Visit `/progress` → enter weight → **Save progress** | New entry added, chart updates |
| 16 | Visit `/calendar` | Month grid + "Up next" sessions |

---

## 4. What to specifically watch for

Things that should **definitely** work — if any fail, it's a bug:

- **Numeric inputs reject letters.** On `/register` Step 3 / `/profile` / `/progress`, type `abc123def` into HEIGHT — only `123` should appear. (SRS NFR 5.3)
- **Route guards block anonymous access.** Without signing in, paste `/dashboard` or `/diet` in the URL bar — both should bounce to `/login`. (SRS §3.2)
- **Tweaks panel** (bottom-right floating box):
  - Switching **Personal beats** Inter ↔ EB Garamond changes the greeting font instantly across the page
  - Switching **Accent** color recolors all coral elements (CTAs, streak pills, progress bars)
- **Calorie ring** on `/diet` is a dynamic SVG donut showing intake %. (SRS NFR 5.3)
- **Health disclaimer modal** must appear on the *first* "Generate plan" tap, before the AI request fires. (SRS NFR 5.6)
- **Bottom TabBar** (Home / Train / Eat / Stats) is visible on Dashboard, Activity, Diet, Progress.
- **Avatar = sign out.** Tap the circle in the top-right of the Dashboard.

---

## 5. All 11 routes

You should be able to reach every URL directly:

| URL | Screen |
|---|---|
| `/` | Auto-redirects by role |
| `/login` | Sign in |
| `/register` | 3-step registration |
| `/dashboard` | Gym User home |
| `/activity` | Log activity |
| `/diet` | Log diet (with calorie ring) |
| `/plan` | Create workout plan |
| `/profile` | Edit fitness profile |
| `/progress` | Update body measurements |
| `/calendar` | Schedule sessions |
| `/milestone` | Celebration screen |

---

## 6. If something breaks

Open your browser's DevTools:
- **Chrome / Edge:** `Cmd + Option + I` (Mac), `F12` (Windows)
- **Safari:** enable Develop menu in Settings, then `Cmd + Option + I`

Go to the **Console** tab. Common errors:

| Error message | What it means | Fix |
|---|---|---|
| `ERR_CONNECTION_REFUSED @ http://localhost:8000/...` | Wong's backend isn't running | Start it on the Foundation branch |
| `404 Not Found` on `/auth/...` | Backend running but on wrong port | Check terminal — match it with `.env.local`'s `NEXT_PUBLIC_API_BASE_URL` |
| `CORS error` | Backend doesn't allow `localhost:3000` | Wong needs to add CORS middleware in FastAPI |
| `Cannot read properties of undefined` | Possibly a frontend bug — paste the error to me | I'll add a defensive fix |

---

## 7. Production-build smoke test

Before pushing or deploying, verify the production build still compiles:

```bash
npm run build
```

Should end with:

```
✓ Compiled successfully
✓ Generating static pages (14/14)
```

Plus a table of route sizes. If any of those steps fail, the deploy will fail too.

---

## 8. (Optional) Automated browser testing with Playwright

For repeating the demo flow without clicking by hand, install Playwright CLI globally:

```bash
npm install -g @playwright/cli@latest
```

Then in a third terminal (with both dev server and backend running):

```bash
playwright-cli open http://localhost:3000/
playwright-cli snapshot                          # see what's on the page
playwright-cli click e15                         # click an element by ref (from snapshot)
playwright-cli fill e30 "alex@onefit.com"        # fill a field
playwright-cli goto http://localhost:3000/diet   # navigate
playwright-cli close                             # done
```

This is mostly useful for catching regressions when changing screen code. Optional — you don't need it to test for a demo.
