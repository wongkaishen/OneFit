# Tier 1 — Gym User Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the no-infrastructure Gym User gaps from `docs/feature_verification.md` — plan edit/discard (A6/A7), calorie-burn estimation (A13), weekly consistency metrics (A14), progress trend chart (A25), conflict-slot suggestion (A31), and workout reminders (A32).

**Architecture:** Business logic that can be tested without a database is extracted into pure functions under `backend/app/services/` (`calories.py`, `metrics.py`, `scheduling.py`) and unit-tested in `backend/tests/`. The gym router wires those helpers into existing endpoints and adds `PATCH`/`DELETE /gym/plans/{id}`. Frontend changes are typed wrappers in `lib/api/gym.ts` plus UI on existing pages; per repo convention there are **no automated frontend tests** — verify with `npm run build` + `npm run lint` + manual click-through.

**Tech Stack:** FastAPI + async SQLAlchemy 2.0 (backend), pytest (backend tests, no DB), Next.js 14 App Router + TypeScript + Tailwind (frontend).

## Global Constraints

- Schema lives in SQL migrations + ORM; **do not** add `Base.metadata.create_all` or Alembic. Tier 1 needs **no** schema change (discard uses hard `DELETE`; `plan_status` enum stays `active`/`superseded`).
- `plan_status` enum values are exactly `('active', 'superseded')`. `session_status` is `('scheduled','completed','missed')`. Do not invent new enum values.
- Backend DB-backed endpoints are **not** unit-tested (no live Supabase in CI); only pure functions get pytest coverage. Endpoint wiring is verified via smoke tests (`backend/tests/test_smoke.py`) + manual.
- Do **not** add automated frontend tests (uni-project convention). Verify frontend with `cd frontend && npm run build && npm run lint`.
- All frontend HTTP goes through typed wrappers in `lib/api/gym.ts`; never call `fetch` from a component.
- Backend venv lives at `backend/env/` — activate with `source env/bin/activate`.
- Run backend tests with `cd backend && python -m pytest -q`.

---

### Task 1: MET-based calorie-burn estimator (A13)

**Files:**
- Create: `backend/app/services/calories.py`
- Test: `backend/tests/test_calories.py`

**Interfaces:**
- Produces: `estimate_calories_burned(workout_type: str | None, duration_min: int | None, weight_kg: float | None) -> float | None`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_calories.py`:

```python
from app.services.calories import estimate_calories_burned


def test_running_uses_higher_met():
    # MET 9.8 * 3.5 * 70kg / 200 * 30min = 360.2
    assert estimate_calories_burned("Running", 30, 70) == 360.2


def test_yoga_uses_lower_met():
    # MET 3.0 * 3.5 * 60kg / 200 * 60min = 189.0
    assert estimate_calories_burned("yoga", 60, 60) == 189.0


def test_unknown_type_uses_default_met():
    # default MET 4.0 * 3.5 * 70 / 200 * 30 = 147.0
    assert estimate_calories_burned("underwater basket weaving", 30, 70) == 147.0


def test_missing_weight_defaults_to_70kg():
    assert estimate_calories_burned("Running", 30, None) == 360.2


def test_no_duration_returns_none():
    assert estimate_calories_burned("Running", None, 70) is None
    assert estimate_calories_burned("Running", 0, 70) is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source env/bin/activate && python -m pytest tests/test_calories.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.calories'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/services/calories.py`:

```python
"""MET-based calorie-burn estimation (Gym User A13).

When a gym user logs activity without entering calories burned, estimate it from
the workout type and duration using MET values (Compendium of Physical Activities,
rounded). Pure function — no DB — so it is unit-tested directly.
"""

# Substring-matched against the user's free-text workout_type, first match wins.
MET_TABLE: dict[str, float] = {
    "run": 9.8,
    "hiit": 8.5,
    "swim": 8.0,
    "cycl": 7.5,
    "bik": 7.5,
    "row": 7.0,
    "cardio": 7.0,
    "elliptical": 5.0,
    "strength": 5.0,
    "weight": 5.0,
    "walk": 3.5,
    "yoga": 3.0,
}
DEFAULT_MET = 4.0
DEFAULT_WEIGHT_KG = 70.0


def estimate_calories_burned(
    workout_type: str | None,
    duration_min: int | None,
    weight_kg: float | None,
) -> float | None:
    """Estimate kcal burned, or None when duration is missing/zero.

    kcal = MET * 3.5 * weight_kg / 200 * minutes
    """
    if not duration_min or duration_min <= 0:
        return None
    weight = weight_kg if weight_kg and weight_kg > 0 else DEFAULT_WEIGHT_KG
    met = DEFAULT_MET
    if workout_type:
        key = workout_type.strip().lower()
        for needle, value in MET_TABLE.items():
            if needle in key:
                met = value
                break
    return round(met * 3.5 * weight / 200 * duration_min, 1)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_calories.py -q`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/calories.py backend/tests/test_calories.py
git commit -m "feat(gym): MET-based calorie-burn estimator (A13)"
```

---

### Task 2: Wire calorie estimation into activity logging (A13)

**Files:**
- Modify: `backend/app/subsystems/gym_user/router.py` (imports near line 20; `log_activity` near lines 151-164)

**Interfaces:**
- Consumes: `estimate_calories_burned(...)` from Task 1; `FitnessProfile` (already imported) has `.weight`.
- Produces: `POST /gym/activity` now backfills `calories_burned` when omitted.

- [ ] **Step 1: Add the import**

In `backend/app/subsystems/gym_user/router.py`, add below the existing `from app.services.milestones import check_and_award` line:

```python
from app.services.calories import estimate_calories_burned
```

- [ ] **Step 2: Backfill calories in `log_activity`**

Replace the body of `log_activity` (currently lines ~151-164) with:

```python
@router.post("/activity", status_code=status.HTTP_201_CREATED)
async def log_activity(body: ActivityLogIn, user: GymUserDep, db: DbDep):
    data = body.model_dump()
    # A13: if the user didn't enter calories burned, estimate from type + duration.
    if data.get("calories_burned") is None:
        profile = await db.get(FitnessProfile, uuid.UUID(user.id))
        data["calories_burned"] = estimate_calories_burned(
            data.get("workout_type"),
            data.get("duration"),
            float(profile.weight) if profile and profile.weight else None,
        )
    log = ActivityLog(
        log_id=uuid.uuid4(),
        user_id=uuid.UUID(user.id),
        status="completed",
        **data,
    )
    db.add(log)
    # Award any milestones this log just unlocked (same transaction).
    await check_and_award(db, uuid.UUID(user.id))
    await db.commit()
    await db.refresh(log)
    return log
```

- [ ] **Step 3: Verify the app still imports and smoke tests pass**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS (no import errors; routes still mount)

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/gym_user/router.py
git commit -m "feat(gym): auto-estimate calories burned on activity log (A13)"
```

---

### Task 3: Weekly consistency metrics helper (A14)

**Files:**
- Create: `backend/app/services/metrics.py`
- Test: `backend/tests/test_metrics.py`

**Interfaces:**
- Produces: `weekly_consistency(active_dates: set[datetime.date], today: datetime.date) -> dict` returning keys `active_days_this_week: int`, `current_streak: int`, `weekly_goal: int`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_metrics.py`:

```python
import datetime as dt

from app.services.metrics import weekly_consistency


def test_counts_active_days_in_trailing_week():
    today = dt.date(2026, 6, 28)
    active = {today, today - dt.timedelta(days=2), today - dt.timedelta(days=8)}
    result = weekly_consistency(active, today)
    assert result["active_days_this_week"] == 2  # the day-8 one is outside the window
    assert result["weekly_goal"] == 7


def test_streak_counts_consecutive_days_up_to_today():
    today = dt.date(2026, 6, 28)
    active = {today, today - dt.timedelta(days=1), today - dt.timedelta(days=2)}
    assert weekly_consistency(active, today)["current_streak"] == 3


def test_streak_breaks_on_gap():
    today = dt.date(2026, 6, 28)
    active = {today, today - dt.timedelta(days=2)}
    assert weekly_consistency(active, today)["current_streak"] == 1


def test_no_activity_today_means_zero_streak():
    today = dt.date(2026, 6, 28)
    active = {today - dt.timedelta(days=1)}
    assert weekly_consistency(active, today)["current_streak"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_metrics.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.metrics'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/services/metrics.py`:

```python
"""Weekly consistency metrics (Gym User A14).

Pure aggregation over the set of dates a user was active (logged activity or
diet). No DB — the router gathers the dates and passes them in.
"""

import datetime as dt

WEEKLY_GOAL_DAYS = 7


def weekly_consistency(active_dates: set[dt.date], today: dt.date) -> dict:
    """Active-days-this-week and current streak from a set of active dates."""
    window = {today - dt.timedelta(days=i) for i in range(WEEKLY_GOAL_DAYS)}
    active_this_week = len(window & active_dates)

    streak = 0
    cursor = today
    while cursor in active_dates:
        streak += 1
        cursor -= dt.timedelta(days=1)

    return {
        "active_days_this_week": active_this_week,
        "current_streak": streak,
        "weekly_goal": WEEKLY_GOAL_DAYS,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_metrics.py -q`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/metrics.py backend/tests/test_metrics.py
git commit -m "feat(gym): weekly consistency metrics helper (A14)"
```

---

### Task 4: Add weekly metrics to the dashboard endpoint (A14)

**Files:**
- Modify: `backend/app/subsystems/gym_user/router.py` (`dashboard`, lines ~179-201)

**Interfaces:**
- Consumes: `weekly_consistency(...)` from Task 3.
- Produces: `GET /gym/dashboard` response gains `active_days_this_week`, `current_streak`, `weekly_goal`.

- [ ] **Step 1: Add the import**

Add near the other service imports in `gym_user/router.py`:

```python
from app.services.metrics import weekly_consistency
```

- [ ] **Step 2: Compute active dates and merge into the response**

In `dashboard`, after the `burned = (...).scalars().all()` block and before the `return {`, insert:

```python
    # A14: trailing-week consistency over distinct active dates (activity OR diet).
    since = day - dt.timedelta(days=6)
    act_dates = (
        await db.execute(
            select(ActivityLog.log_date).where(
                ActivityLog.user_id == uid, ActivityLog.log_date >= since
            )
        )
    ).scalars().all()
    diet_dates = (
        await db.execute(
            select(DietaryLog.log_date).where(
                DietaryLog.user_id == uid, DietaryLog.log_date >= since
            )
        )
    ).scalars().all()
    consistency = weekly_consistency(set(act_dates) | set(diet_dates), day)
```

Then change the `return` dict to spread `consistency`:

```python
    return {
        "date": day,
        "calories_consumed": float(sum(d.calories or 0 for d in consumed)),
        "calories_burned": float(sum(a.calories_burned or 0 for a in burned)),
        "diet_entries": len(consumed),
        "activity_entries": len(burned),
        **consistency,
    }
```

- [ ] **Step 3: Verify smoke tests pass**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/gym_user/router.py
git commit -m "feat(gym): surface weekly consistency on dashboard (A14)"
```

---

### Task 5: Next-free-slot suggestion helper (A31)

**Files:**
- Create: `backend/app/services/scheduling.py`
- Test: `backend/tests/test_scheduling.py`

**Interfaces:**
- Produces: `suggest_alternative_slot(requested: datetime.time, booked: set[datetime.time], step_min: int = 30, max_tries: int = 48) -> datetime.time | None`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_scheduling.py`:

```python
import datetime as dt

from app.services.scheduling import suggest_alternative_slot


def test_suggests_next_half_hour_when_requested_is_taken():
    booked = {dt.time(9, 0)}
    assert suggest_alternative_slot(dt.time(9, 0), booked) == dt.time(9, 30)


def test_skips_consecutive_booked_slots():
    booked = {dt.time(9, 0), dt.time(9, 30), dt.time(10, 0)}
    assert suggest_alternative_slot(dt.time(9, 0), booked) == dt.time(10, 30)


def test_returns_none_when_no_slot_found():
    # every half-hour slot booked -> nothing free
    booked = {dt.time(h, m) for h in range(24) for m in (0, 30)}
    assert suggest_alternative_slot(dt.time(9, 0), booked) is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_scheduling.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.scheduling'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/services/scheduling.py`:

```python
"""Workout-slot conflict resolution (Gym User A31).

When a requested session time clashes, propose the next free half-hour slot the
same day. Pure function — the router supplies the set of already-booked times.
"""

import datetime as dt


def suggest_alternative_slot(
    requested: dt.time,
    booked: set[dt.time],
    step_min: int = 30,
    max_tries: int = 48,
) -> dt.time | None:
    """Next time after `requested` (in `step_min` increments) not in `booked`."""
    candidate = requested
    base = dt.date.min
    for _ in range(max_tries):
        candidate = (
            dt.datetime.combine(base, candidate) + dt.timedelta(minutes=step_min)
        ).time()
        if candidate not in booked:
            return candidate
    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_scheduling.py -q`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/scheduling.py backend/tests/test_scheduling.py
git commit -m "feat(gym): next-free-slot suggestion helper (A31)"
```

---

### Task 6: Conflict suggestion + reminder in schedule_session (A31, A32)

**Files:**
- Modify: `backend/app/subsystems/gym_user/router.py` (`schedule_session`, lines ~295-332)

**Interfaces:**
- Consumes: `suggest_alternative_slot(...)` from Task 5; `notify(...)` from `app.services.notification`.
- Produces: `POST /gym/sessions` returns a 409 whose detail names the next free slot, and emits a reminder notification when `reminder_set` is true.

- [ ] **Step 1: Add imports**

In `gym_user/router.py` add:

```python
from app.services.scheduling import suggest_alternative_slot
from app.services.notification import notify
```

- [ ] **Step 2: Replace the conflict branch to suggest an alternative**

In `schedule_session`, replace the conflict block. Currently it selects a single `clash`; change it to gather **all** booked times that day so it can both detect the clash and suggest a slot:

```python
    # UC9 / A31 conflict check: gather all booked times on that date.
    booked_times = (
        await db.execute(
            select(WorkoutSession.scheduled_time)
            .join(WorkoutPlan, WorkoutPlan.plan_id == WorkoutSession.plan_id)
            .where(
                WorkoutPlan.user_id == uuid.UUID(user.id),
                WorkoutSession.scheduled_date == body.scheduled_date,
                WorkoutSession.status == "scheduled",
            )
        )
    ).scalars().all()
    if body.scheduled_time in set(booked_times):
        alt = suggest_alternative_slot(body.scheduled_time, set(booked_times))
        hint = f" Next free slot that day is {alt.strftime('%H:%M')}." if alt else ""
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"That time slot conflicts with an existing scheduled session.{hint}",
        )
```

- [ ] **Step 3: Emit a reminder notification after the session is created**

In `schedule_session`, after `db.add(session)` and before `await db.commit()`, insert:

```python
    # A32: queue a workout reminder for the user (same transaction).
    if body.reminder_set:
        await notify(
            db,
            recipient_id=uuid.UUID(user.id),
            type="workout_reminder",
            title="Workout reminder set",
            body=f"You scheduled a workout on {body.scheduled_date} at {body.scheduled_time.strftime('%H:%M')}.",
            ref_type="workout_session",
            ref_id=session.session_id,
        )
```

- [ ] **Step 4: Verify smoke tests pass**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/gym_user/router.py
git commit -m "feat(gym): suggest alternative slot on conflict + workout reminder (A31, A32)"
```

---

### Task 7: Edit + discard workout plan endpoints (A6, A7)

**Files:**
- Modify: `backend/app/subsystems/gym_user/router.py` (add a `PlanUpdate` schema near the other schemas ~line 53; add two routes after `create_plan` ~line 147)

**Interfaces:**
- Produces:
  - `PATCH /gym/plans/{plan_id}` body `{ goal?: str, status?: "active" | "superseded" }` → updated plan (404 if not owned).
  - `DELETE /gym/plans/{plan_id}` → 204 (cascades sessions; 404 if not owned).

- [ ] **Step 1: Add the `PlanUpdate` schema**

After the `WorkoutPlanIn` class in `gym_user/router.py`, add:

```python
class PlanUpdate(BaseModel):
    goal: str | None = None
    status: str | None = None  # 'active' | 'superseded'
```

- [ ] **Step 2: Add the PATCH and DELETE routes**

Immediately after `create_plan` (after line ~147), add:

```python
@router.patch("/plans/{plan_id}")
async def update_plan(plan_id: uuid.UUID, body: PlanUpdate, user: GymUserDep, db: DbDep):
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None or plan.user_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout plan not found")
    updates = body.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in ("active", "superseded"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    for field, value in updates.items():
        setattr(plan, field, value)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def discard_plan(plan_id: uuid.UUID, user: GymUserDep, db: DbDep):
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None or plan.user_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout plan not found")
    await db.delete(plan)  # workout_sessions cascade via FK ondelete=CASCADE
    await db.commit()
```

- [ ] **Step 3: Assert the new routes appear in the OpenAPI smoke test**

Add to `backend/tests/test_smoke.py` inside `test_openapi_lists_all_subsystems`, extend the `expected` list with `"/gym/plans/{plan_id}"`:

```python
    for expected in ["/auth/register", "/gym/profile", "/specialist/feedback",
                     "/admin/users", "/ai/workout-plan", "/gym/plans/{plan_id}"]:
        assert expected in paths
```

- [ ] **Step 4: Run smoke tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS (the new path is present)

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/gym_user/router.py backend/tests/test_smoke.py
git commit -m "feat(gym): edit + discard workout plan endpoints (A6, A7)"
```

---

### Task 8: Frontend wrappers for plan edit/discard + dashboard type (A6, A7, A14)

**Files:**
- Modify: `frontend/lib/api/gym.ts` (after the `createPlan` wrapper, ~line 23)
- Modify: `frontend/lib/api/types.ts` (`GymDashboard`, lines 146-152)

**Interfaces:**
- Produces: `updatePlan(id, body)`, `discardPlan(id)` wrappers; `GymDashboard` gains the three weekly fields.

- [ ] **Step 1: Add the wrappers**

In `frontend/lib/api/gym.ts`, after the `createPlan` export, add:

```ts
export const updatePlan = (id: string, body: { goal?: string; status?: string }) =>
  request<WorkoutPlan>(`/gym/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const discardPlan = (id: string) =>
  request<void>(`/gym/plans/${id}`, { method: "DELETE" });
```

- [ ] **Step 2: Extend the `GymDashboard` type**

In `frontend/lib/api/types.ts`, replace the `GymDashboard` interface (lines 146-152) with:

```ts
export interface GymDashboard {
  date: string;
  calories_consumed: number;
  calories_burned: number;
  diet_entries: number;
  activity_entries: number;
  active_days_this_week: number;
  current_streak: number;
  weekly_goal: number;
}
```

- [ ] **Step 3: Type-check via build**

Run: `cd frontend && npm run lint`
Expected: no new lint/type errors from these files.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api/gym.ts frontend/lib/api/types.ts
git commit -m "feat(gym): api wrappers for plan edit/discard + weekly dashboard fields"
```

---

### Task 9: Plans page — edit + discard UI (A6, A7)

**Files:**
- Modify: `frontend/app/gym/plans/page.tsx` (imports line 12; the plan list rows lines ~91-104)

**Interfaces:**
- Consumes: `updatePlan`, `discardPlan` from Task 8.

- [ ] **Step 1: Import the new wrappers**

Change line 12 of `frontend/app/gym/plans/page.tsx`:

```ts
import { listPlans, createPlan, listMealPlans, updatePlan, discardPlan } from "@/lib/api/gym";
```

- [ ] **Step 2: Add edit/discard handlers above the `return`**

Inside `GymPlansPage`, before `return (`, add:

```ts
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState("");

  const saveEdit = async (id: string) => {
    if (!editGoal.trim()) return;
    try {
      const updated = await updatePlan(id, { goal: editGoal.trim() });
      setData((prev) => (prev ?? []).map((p) => (p.plan_id === id ? updated : p)));
      setEditingId(null);
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Failed to update plan");
    }
  };

  const discard = async (id: string) => {
    if (!confirm("Discard this plan? Its scheduled sessions will be removed.")) return;
    try {
      await discardPlan(id);
      setData((prev) => (prev ?? []).filter((p) => p.plan_id !== id));
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : "Failed to discard plan");
    }
  };
```

- [ ] **Step 3: Render edit/discard controls in each plan row**

Replace the plan-row block (lines ~91-104, the `{(data ?? []).map((p) => (...))}`) with:

```tsx
            {(data ?? []).map((p) => (
              <div key={p.plan_id}>
                <div className="flex items-center justify-between py-4">
                  {editingId === p.plan_id ? (
                    <input
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      className="h-[36px] flex-1 border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
                    />
                  ) : (
                    <div>
                      <div className="font-sans text-[14px] text-charcoal">{p.goal}</div>
                      <div className="mt-1 font-sans text-[11px] text-muted">
                        Created {shortDate(p.created_at)} · via {p.generated_by}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge tone={p.status === "active" ? "good" : "neutral"}>{p.status}</Badge>
                    {editingId === p.plan_id ? (
                      <>
                        <Button type="button" variant="dark" onClick={() => saveEdit(p.plan_id)}>Save</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" onClick={() => { setEditingId(p.plan_id); setEditGoal(p.goal); }}>Edit</Button>
                        <Button type="button" variant="ghost" onClick={() => discard(p.plan_id)}>Discard</Button>
                      </>
                    )}
                  </div>
                </div>
                <Hairline />
              </div>
            ))}
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/gym/plans/page.tsx
git commit -m "feat(gym): edit + discard workout plan UI (A6, A7)"
```

---

### Task 10: Dashboard page — weekly consistency UI (A14)

**Files:**
- Modify: `frontend/app/gym/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GymDashboard.active_days_this_week`, `current_streak`, `weekly_goal` (Task 8).

- [ ] **Step 1: Read the current dashboard page to locate the stats area**

Run: `sed -n '1,80p' frontend/app/gym/dashboard/page.tsx` and find where `GymDashboard` data (`d`/`data`) renders the calorie numbers.

- [ ] **Step 2: Add a consistency strip**

Where the dashboard renders its metric cards, add a block (adapt the variable name to whatever holds the `GymDashboard` object, e.g. `data`):

```tsx
{data && (
  <div className="mt-6 flex gap-8 border border-border bg-white p-5">
    <div>
      <Label>Current streak</Label>
      <div className="mt-1 font-serif text-[28px] text-charcoal">{data.current_streak}d</div>
    </div>
    <div>
      <Label>Active days this week</Label>
      <div className="mt-1 font-serif text-[28px] text-charcoal">
        {data.active_days_this_week}/{data.weekly_goal}
      </div>
    </div>
  </div>
)}
```

Ensure `Label` is imported (`import { Label } from "@/components/ui/Label";`).

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/gym/dashboard/page.tsx
git commit -m "feat(gym): weekly streak + active-days on dashboard (A14)"
```

---

### Task 11: Progress page — weight trend chart (A25)

**Files:**
- Modify: `frontend/app/gym/progress/page.tsx` (imports; render area near the trend summary ~line 99-124)

**Interfaces:**
- Consumes: `BarChart` (`components/ui/BarChart.tsx`, prop `data: { k: string; v: number }[]`); `GymProgressEntry[]` already loaded on the page.

- [ ] **Step 1: Import BarChart and shortDate**

Add to the imports in `frontend/app/gym/progress/page.tsx`:

```ts
import { BarChart } from "@/components/ui/BarChart";
import { shortDate } from "@/lib/format";
```

- [ ] **Step 2: Build the chart series from progress entries**

Inside the component, after the progress data is available (the same array the text summary uses, assume it is `entries` or `data` — use the actual variable on the page), derive an oldest→newest weight series:

```ts
  const weightSeries = [...(progressData ?? [])]
    .filter((e) => e.weight != null)
    .reverse()
    .slice(-8)
    .map((e) => ({ k: shortDate(e.recorded_at), v: Number(e.weight) }));
```

(Replace `progressData` with the page's actual progress-entries variable.)

- [ ] **Step 3: Render the chart above the share button**

Before the "Share latest" controls (~line 121), add:

```tsx
{weightSeries.length > 0 && (
  <div className="mt-6 border border-border bg-white p-5">
    <Label>Weight trend</Label>
    <div className="mt-4">
      <BarChart data={weightSeries} />
    </div>
  </div>
)}
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/gym/progress/page.tsx
git commit -m "feat(gym): weight trend chart on progress page (A25)"
```

---

### Task 12: Final verification + docs

**Files:**
- Modify: `docs/feature_verification.md` (rows A6, A7, A13, A14, A25, A31, A32)

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && python -m pytest -q`
Expected: PASS (all new pure-function tests + smoke).

- [ ] **Step 2: Build + lint the frontend**

Run: `cd frontend && npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 3: Update the verification doc**

Flip these rows to ✅ with the new evidence:
- A6 → `PATCH /gym/plans/{id}`, plans page edit.
- A7 → `DELETE /gym/plans/{id}`, plans page discard.
- A13 → `services/calories.py` estimator wired into `POST /gym/activity`.
- A14 → `services/metrics.py`, dashboard weekly fields + UI.
- A25 → `BarChart` on progress page.
- A31 → 409 detail names next free slot (`services/scheduling.py`).
- A32 → reminder notification on session create.

- [ ] **Step 4: Commit**

```bash
git add docs/feature_verification.md
git commit -m "docs: mark Tier 1 gym quick wins complete (A6,A7,A13,A14,A25,A31,A32)"
```

---

## Self-Review

**Spec coverage:** A6 (Task 7/9), A7 (Task 7/9), A13 (Task 1/2), A14 (Task 3/4/10), A25 (Task 11), A31 (Task 5/6), A32 (Task 6) — all seven Tier-1 gym items have tasks.

**Placeholder scan:** Two intentional "use the page's actual variable name" notes in Tasks 10/11 (dashboard/progress) because those pages weren't fully read at plan time — the executing agent must read the file first (Task 10 Step 1 makes this explicit). All backend code is complete and exact.

**Type consistency:** `estimate_calories_burned`, `weekly_consistency`, `suggest_alternative_slot` signatures match between definition tasks and their callers. `GymDashboard` extra fields match the backend dict keys (`active_days_this_week`, `current_streak`, `weekly_goal`). `updatePlan`/`discardPlan` wrapper paths match the `PATCH`/`DELETE /gym/plans/{plan_id}` routes.
