# Changes by Yap

A running log of changes made during this work session.

---

## 1. Specialist meal plan — gym user can now view it

**Problem:** When a wellness specialist published a meal plan to a gym user, the
backend stored the plan and sent a notification, but the gym user had no way to
read the plan content — they only saw the notification text.

**Fix:** Added a gym-side endpoint, API wrapper, and UI to display the meal plan.

| File | Change |
|------|--------|
| `backend/app/subsystems/gym_user/router.py` | Imported `MealPlan` model; added `GET /gym/meal-plans` returning plans where `client_id` = current user (ordered newest first). |
| `frontend/lib/api/gym.ts` | Imported `MealPlanOut` type; added `listMealPlans()` calling `/gym/meal-plans`. |
| `frontend/app/gym/diet/page.tsx` | Added a "Your meal plan" card at the top of the Log diet screen — renders plan name, goal, created date, and each day's meals/items from the saved payload. Uses `useResource(listMealPlans)`. |

**How to test:** Log in as the gym user who received a plan → go to **Log diet** →
the plan shows at the top of the page.

---

## 2. Swagger docs page (`/docs`) was blank

**Problem:** `http://localhost:8000/docs` showed a white page. Cause was
environmental, not code: FastAPI's default docs load Swagger UI assets from
`cdn.jsdelivr.net`, which is unreachable on this network. The backend itself
(all endpoints + `/openapi.json`) was working the whole time.

**Fix:** Pointed the docs assets at `unpkg` (reachable on this network) instead.

| File | Change |
|------|--------|
| `backend/app/main.py` | Disabled FastAPI's built-in docs (`docs_url=None`, `redoc_url=None`); re-added custom `/docs` (Swagger UI) and `/redoc` routes that load their JS/CSS from `unpkg.com`. |

**Note:** This only changes where the docs *page* downloads its display scripts.
No endpoint, model, or business logic was touched. If a future network also
blocks `unpkg`, the page would go blank again — but the API always works regardless.

**How to test:** Hard-refresh `http://localhost:8000/docs` (Cmd+Shift+R).

---

## 3. Educational content — drafts could not be edited or published

**Problem:** A wellness specialist could save educational content as a Draft, but
then had no way to publish or edit it. The "Edit" link on each content card did
nothing, and there was no backend endpoint to update existing content — so a draft
was stuck forever.

**Fix:** Added an update endpoint, API wrapper, and content-card actions.

| File | Change |
|------|--------|
| `backend/app/subsystems/wellness_specialist/router.py` | Added `ContentUpdate` schema and `PATCH /specialist/content/{content_id}` — edits fields and/or status (Draft / Published / Archived), owner-only, keeps `visibility` in sync (archived = hidden). |
| `frontend/lib/api/specialist.ts` | Added `ContentUpdate` type and `updateContent(id, body)` calling the PATCH route. |
| `frontend/app/specialist/content/page.tsx` | "Edit" now opens the form pre-filled and saves via PATCH; each card has **Publish**, **Archive**, and **Restore** (for archived) quick actions. Permission checkbox only shows when creating, not editing. |

**A specialist can now:** save a draft then publish it, edit any content's
title/body/category/media, archive published content, and restore archived back to Draft.

**How to test:** Specialist → Content → create a draft → use the Publish / Edit /
Archive links on its card.

---

## 4. Gym user could not view a meal plan published to them

**Problem:** A specialist could publish a meal plan to a gym user (notification was
sent), but the gym user had no endpoint or screen to read the plan content.

**Fix:** Added a gym-side endpoint, API wrapper, and a shared display card shown in
two places.

| File | Change |
|------|--------|
| `backend/app/subsystems/gym_user/router.py` | Imported `MealPlan`; added `GET /gym/meal-plans` returning plans where `client_id` = current user. |
| `frontend/lib/api/gym.ts` | Imported `MealPlanOut`; added `listMealPlans()`. |
| `frontend/components/MealPlanCard.tsx` | New shared component rendering a plan's name, goal, date, and each day's meals/items. |
| `frontend/app/gym/diet/page.tsx` | Shows the meal plan card at the top of Log diet. |
| `frontend/app/gym/plans/page.tsx` | Shows the meal plan card (where a "meal plan" notification naturally leads). |

**How to test:** Log in as a real `gym_user` (in its own browser/incognito so the
token isn't overwritten) → **Plans** or **Diet** → the published plan appears.

---

## 5. Specialist could send meal plans / feedback to non-gym-users (admins, specialists)

**Problem:** A wellness specialist was able to publish a meal plan to an **admin**
account. Root cause: the account was a gym user earlier, kept a stale `gym_users`
row after being switched to admin, and the backend trusted that foreign key instead
of the account's current role. The same gap existed in `submit_feedback`.

**Fix:** Both endpoints now validate the recipient's **current** `profiles.role`.

| File | Change |
|------|--------|
| `backend/app/subsystems/wellness_specialist/router.py` | `create_meal_plan` and `submit_feedback` now look up the target `Profile` and reject with 404 (not found) or 422 ("…can only be …to gym users.") if `role != 'gym_user'`. Template meal plans (`client_id = null`) are still allowed. |

**Data cleanup (one-off, destructive — done intentionally):**
- Deleted 2 `meal_plans` rows that had been assigned to the admin account.
- Deleted 2 orphaned `meal_plan` notifications sent to that admin account.
- Remaining: 1 meal plan correctly assigned to a gym user.

**How to test:** As a specialist, the client dropdowns only list gym users; the
backend now also rejects any direct attempt to target a non-gym-user.

---

## Verification

- Backend smoke tests: `python -m pytest tests/test_smoke.py -q` → **13 passed**
- Frontend production build: `npm run build` → **succeeds**, all routes compile.

---

## Known issue noticed (not changed)

There are two frontend trees under `frontend/`:

- **Live (what runs):** `frontend/app/` + `frontend/lib/` + `frontend/components/`
- **Stale leftover:** `frontend/src/`

The live app is built from `app/` + `lib/`. The `frontend/src/` folder appears to
be dead code from an earlier layout. Left untouched — flagged here for a future
cleanup decision (would confirm with `git status` before removing anything).
