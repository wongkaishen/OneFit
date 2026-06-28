# Tier 1 — Specialist + Admin Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the no-infrastructure Specialist + Admin gaps from `docs/feature_verification.md` — wellness-task assignment UI (B8), hard-delete educational content (B13), trend-based recommendation (B21), feedback draft auto-save (B22), specialist approval gate (B3), admin registrations UI (C6/C7), admin program-removal UI (C12), admin per-user activity monitor (C11), and admin notify-compose UI (C14).

**Architecture:** All required backend endpoints already exist except a content `DELETE`, an admin user-detail read (C11), and a derived recommendation on health-trend creation (B21). The bulk of this tier is **frontend** — new typed wrappers in `lib/api/specialist.ts` / `lib/api/admin.ts`, three new admin pages (`registrations`, `programs`, plus a compose form on the existing notifications page), one new specialist page (`tasks`), and localStorage draft auto-save on the feedback form. The approval gate (B3) is a one-line status change at registration that the existing `AuthGate` already enforces.

**Tech Stack:** FastAPI + async SQLAlchemy 2.0 (backend), pytest (pure-function + smoke tests, no DB), Next.js 14 App Router + TypeScript + Tailwind (frontend, no automated tests).

## Global Constraints

- Schema lives in SQL migrations + ORM; **no** `create_all`/Alembic. This tier needs **no** schema change.
- `account_status` enum is `('pending', 'active', 'suspended')`; `content_status` is `('Draft','Published','Archived','Rejected')`. Do not invent enum values.
- `AuthGate` (`frontend/components/shell/AuthGate.tsx`) already redirects any user whose account isn't `active` to `/login` — the B3 gate relies on this existing behavior.
- Frontend HTTP only through typed wrappers; never `fetch` from a component. Backend venv at `backend/env/`. Backend tests: `cd backend && python -m pytest -q`. Frontend verify: `cd frontend && npm run build && npm run lint`.
- New nav items must be added to the relevant `layout.tsx` (`app/specialist/layout.tsx`, `app/admin/layout.tsx`).

---

### Task 1: Hard-delete educational content endpoint (B13)

**Files:**
- Modify: `backend/app/subsystems/wellness_specialist/router.py` (after `update_content`, ~line 205)
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Produces: `DELETE /specialist/content/{content_id}` → 204 (owner only, 404 otherwise).

- [ ] **Step 1: Add the DELETE route**

After the `update_content` function in `wellness_specialist/router.py`, add:

```python
@router.delete("/content/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(content_id: uuid.UUID, user: SpecialistDep, db: DbDep):
    """Permanently remove a piece of educational content (B13). Owner only."""
    content = await db.get(EducationalContent, content_id)
    if content is None or content.specialist_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    await db.delete(content)
    await db.commit()
```

- [ ] **Step 2: Extend the OpenAPI smoke assertion**

In `backend/tests/test_smoke.py` `test_openapi_lists_all_subsystems`, add `"/specialist/content/{content_id}"` to the `expected` list.

- [ ] **Step 3: Run smoke tests**

Run: `cd backend && source env/bin/activate && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/wellness_specialist/router.py backend/tests/test_smoke.py
git commit -m "feat(specialist): hard-delete educational content (B13)"
```

---

### Task 2: Trend recommendation pure function (B21)

**Files:**
- Create: `backend/app/services/recommendations.py`
- Test: `backend/tests/test_recommendations.py`

**Interfaces:**
- Produces: `recommend_from_trends(adherence: float | None, avg_calories: float | None, activity_consistency: float | None, milestone_rate: float | None) -> str`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_recommendations.py`:

```python
from app.services.recommendations import recommend_from_trends


def test_low_adherence_recommends_scheduling_help():
    rec = recommend_from_trends(40.0, 2000.0, 80.0, 50.0)
    assert "adherence" in rec.lower()


def test_low_activity_consistency_recommends_engagement():
    rec = recommend_from_trends(90.0, 2000.0, 30.0, 50.0)
    assert "activity" in rec.lower() or "engagement" in rec.lower()


def test_healthy_metrics_give_positive_message():
    rec = recommend_from_trends(85.0, 2100.0, 80.0, 70.0)
    assert "on track" in rec.lower() or "healthy" in rec.lower()


def test_handles_missing_metrics():
    rec = recommend_from_trends(None, None, None, None)
    assert isinstance(rec, str) and rec
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_recommendations.py -q`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/services/recommendations.py`:

```python
"""Trend-based program recommendation (Wellness Specialist B21).

Turns the aggregate metrics of a HealthTrendReport into one actionable
recommendation string. Pure function — unit-tested directly, surfaced by the
specialist's create-health-trend endpoint and reports page.
"""

ADHERENCE_FLOOR = 60.0
ACTIVITY_FLOOR = 50.0
MILESTONE_FLOOR = 40.0


def recommend_from_trends(
    adherence: float | None,
    avg_calories: float | None,
    activity_consistency: float | None,
    milestone_rate: float | None,
) -> str:
    """One prioritized, plain-language recommendation from cohort aggregates."""
    notes: list[str] = []
    if adherence is not None and adherence < ADHERENCE_FLOOR:
        notes.append(
            f"Session adherence is low ({adherence:.0f}%). Consider shorter, more "
            "frequent sessions or reminders to lift adherence."
        )
    if activity_consistency is not None and activity_consistency < ACTIVITY_FLOOR:
        notes.append(
            f"Only {activity_consistency:.0f}% of users log activity regularly. "
            "Boost engagement with a weekly challenge or check-in."
        )
    if milestone_rate is not None and milestone_rate < MILESTONE_FLOOR:
        notes.append(
            f"Milestone completion is {milestone_rate:.0f}%. Set smaller, "
            "achievable goals so more users hit a milestone."
        )
    if not notes:
        return "Cohort metrics are healthy — members are on track. Keep the current program."
    return " ".join(notes)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_recommendations.py -q`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/recommendations.py backend/tests/test_recommendations.py
git commit -m "feat(specialist): trend-based recommendation helper (B21)"
```

---

### Task 3: Return the recommendation from create_health_trend (B21)

**Files:**
- Modify: `backend/app/subsystems/wellness_specialist/router.py` (`create_health_trend`, the `return report` at ~line 830; imports)

**Interfaces:**
- Consumes: `recommend_from_trends(...)` from Task 2.
- Produces: `POST /specialist/health-trends` response is now `{ ...report fields, "recommendation": str }`.

- [ ] **Step 1: Import the helper**

Add near the other service imports in `wellness_specialist/router.py`:

```python
from app.services.recommendations import recommend_from_trends
```

- [ ] **Step 2: Build the response with the recommendation**

Replace the tail of `create_health_trend` (`db.add(report)` … `return report`) with:

```python
    db.add(report)
    await db.commit()
    await db.refresh(report)
    recommendation = recommend_from_trends(
        adherence, avg_calories, activity_consistency, milestone_rate
    )
    return {
        "report_id": report.report_id,
        "specialist_id": report.specialist_id,
        "cohort": report.cohort,
        "period": report.period,
        "adherence": report.adherence,
        "avg_calories": report.avg_calories,
        "activity_consistency": report.activity_consistency,
        "milestone_rate": report.milestone_rate,
        "created_at": report.created_at,
        "recommendation": recommendation,
    }
```

- [ ] **Step 3: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/wellness_specialist/router.py
git commit -m "feat(specialist): surface trend recommendation on create (B21)"
```

---

### Task 4: Admin per-user activity endpoint (C11)

**Files:**
- Modify: `backend/app/subsystems/admin/router.py` (add route near the user routes ~line 156; ensure `ActivityLog`, `DietaryLog`, `ProgressEntry` imported)
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Produces: `GET /admin/users/{user_id}/activity` → `{ "recent_activity": [...], "recent_diet": [...], "recent_progress": [...] }` (last 10 of each). 404 if no profile.

- [ ] **Step 1: Confirm the model imports**

Run: `grep -nE "ActivityLog|DietaryLog|ProgressEntry" backend/app/subsystems/admin/router.py`. If any are missing from the `from app.models import (...)` block, add them.

- [ ] **Step 2: Add the route**

After the `set_user_role` route in `admin/router.py`, add:

```python
@router.get("/users/{user_id}/activity")
async def user_activity(user_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """Per-user recent activity for the admin monitor (C11)."""
    if await db.get(Profile, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    activity = (await db.execute(
        select(ActivityLog).where(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.log_date.desc()).limit(10)
    )).scalars().all()
    diet = (await db.execute(
        select(DietaryLog).where(DietaryLog.user_id == user_id)
        .order_by(DietaryLog.log_date.desc()).limit(10)
    )).scalars().all()
    progress = (await db.execute(
        select(ProgressEntry).where(ProgressEntry.user_id == user_id)
        .order_by(ProgressEntry.recorded_at.desc()).limit(10)
    )).scalars().all()
    return {"recent_activity": activity, "recent_diet": diet, "recent_progress": progress}
```

- [ ] **Step 3: Extend the OpenAPI smoke assertion**

Add `"/admin/users/{user_id}/activity"` to the `expected` list in `test_openapi_lists_all_subsystems`.

- [ ] **Step 4: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/admin/router.py backend/tests/test_smoke.py
git commit -m "feat(admin): per-user activity monitor endpoint (C11)"
```

---

### Task 5: Specialist approval gate at registration (B3)

**Files:**
- Modify: `backend/app/subsystems/auth/router.py` (`_provision_subtype`, lines ~64-90)

**Interfaces:**
- Produces: a newly registered `wellness_specialist` profile has `status='pending'`; `AuthGate` then blocks them until an admin approves via the existing `/admin/registrations/{id}/approve`.

- [ ] **Step 1: Set specialists pending during provisioning**

In `_provision_subtype`, inside the `if role == "wellness_specialist":` branch, after the `wellness_specialists` insert, add a profile status downgrade:

```python
        if role == "wellness_specialist":
            await db.execute(
                text(
                    "insert into public.wellness_specialists (user_id, specialization) "
                    "values (:id, :spec) on conflict do nothing"
                ),
                {"id": user_id, "spec": "General Wellness"},
            )
            # B3: specialists require admin approval before access. The trigger sets
            # 'active'; downgrade to 'pending' so AuthGate blocks them until approved.
            await db.execute(
                text("update public.profiles set status='pending' where id = :id"),
                {"id": user_id},
            )
```

- [ ] **Step 2: Verify smoke tests pass (no DB needed for import/route checks)**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 3: Manual note for executor**

Document in the PR description: after this change, register a specialist → confirm `/auth/me` reports `status='pending'` and the app bounces to `/login`; approve via `/admin/registrations` → status becomes `active` and access is granted.

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/auth/router.py
git commit -m "feat(auth): gate new specialists behind admin approval (B3)"
```

---

### Task 6: Frontend wrappers — tasks, content delete, admin registrations/programs/notify, user activity

**Files:**
- Modify: `frontend/lib/api/specialist.ts`
- Modify: `frontend/lib/api/admin.ts`
- Modify: `frontend/lib/api/types.ts` (add `WellnessTaskOut`, `WellnessTaskIn`, `ProgramOut`, `AdminUserActivity`)

**Interfaces:**
- Produces: `listTasks`, `assignTask`, `deleteContent` (specialist); `listRegistrations`, `approveRegistration`, `rejectRegistration`, `listPrograms`, `removeProgram`, `sendNotification`, `getUserActivity` (admin).

- [ ] **Step 1: Add the specialist types and wrappers**

In `frontend/lib/api/types.ts` append:

```ts
export interface WellnessTaskOut {
  task_id: string;
  specialist_id: string;
  target_id: string;
  type: string;
  description: string;
  target_metric: string | null;
  due_date: string;
  status: string;
}
export interface WellnessTaskIn {
  target_id: string;
  type: string;
  description: string;
  target_metric?: string | null;
  due_date: string;
}
export interface ProgramOut {
  plan_id: string;
  user_id: string;
  goal: string;
  status: string;
  created_at: string;
  last_activity_at: string | null;
}
export interface AdminUserActivity {
  recent_activity: ActivityLog[];
  recent_diet: DietaryLog[];
  recent_progress: ProgressEntry[];
}
```

In `frontend/lib/api/specialist.ts` add (and extend the type import line with `WellnessTaskOut, WellnessTaskIn`):

```ts
export const listTasks = () => request<WellnessTaskOut[]>("/specialist/tasks");
export const assignTask = (body: WellnessTaskIn) =>
  request<WellnessTaskOut>("/specialist/tasks", { method: "POST", body: JSON.stringify(body) });
export const deleteContent = (id: string) =>
  request<void>(`/specialist/content/${id}`, { method: "DELETE" });
```

- [ ] **Step 2: Add the admin wrappers**

In `frontend/lib/api/admin.ts` add (extend the type import with `ProgramOut, AdminUserActivity`):

```ts
export const listRegistrations = () => request<UserOut[]>("/admin/registrations");
export const approveRegistration = (id: string) =>
  request<UserOut>(`/admin/registrations/${id}/approve`, { method: "POST" });
export const rejectRegistration = (id: string, reason: string) =>
  request<UserOut>(`/admin/registrations/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });

export const listPrograms = (inactiveDays = 30) =>
  request<ProgramOut[]>(`/admin/programs?inactive_days=${inactiveDays}`);
export const removeProgram = (id: string) =>
  request<{ plan_id: string; status: string; sessions_detached: number }>(
    `/admin/programs/${id}/remove`, { method: "POST" });

export const sendNotification = (body: {
  message: string; audience: string; user_id?: string; title?: string;
}) => request<unknown>("/admin/notifications", { method: "POST", body: JSON.stringify(body) });

export const getUserActivity = (id: string) =>
  request<AdminUserActivity>(`/admin/users/${id}/activity`);
```

- [ ] **Step 3: Lint to type-check**

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api/specialist.ts frontend/lib/api/admin.ts frontend/lib/api/types.ts
git commit -m "feat: api wrappers for tasks, content delete, admin registrations/programs/notify (B8,B13,C6,C7,C12,C14,C11)"
```

---

### Task 7: Specialist Wellness Tasks page (B8)

**Files:**
- Create: `frontend/app/specialist/tasks/page.tsx`
- Modify: `frontend/app/specialist/layout.tsx` (nav array, add `{ label: "Tasks", href: "/specialist/tasks" }` after Clients)

**Interfaces:**
- Consumes: `listClients`, `listTasks`, `assignTask` from `lib/api/specialist.ts`.

- [ ] **Step 1: Add the nav item**

In `frontend/app/specialist/layout.tsx`, add to the nav array after the Clients entry:

```ts
  { label: "Tasks", href: "/specialist/tasks" },
```

- [ ] **Step 2: Create the page**

Create `frontend/app/specialist/tasks/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listClients, listTasks, assignTask } from "@/lib/api/specialist";
import { shortDate } from "@/lib/format";
import type { ClientSummary, WellnessTaskOut } from "@/lib/api/types";

export default function SpecialistTasksPage() {
  const clients = useResource<ClientSummary[]>(listClients, []);
  const tasks = useResource<WellnessTaskOut[]>(listTasks, []);
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !type.trim() || !description.trim() || !dueDate) return;
    setErr(null);
    setBusy(true);
    try {
      const task = await assignTask({ target_id: targetId, type: type.trim(), description: description.trim(), due_date: dueDate });
      tasks.setData((prev) => [task, ...(prev ?? [])]);
      setType(""); setDescription(""); setDueDate("");
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Failed to assign task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Wellness tasks" search="Search" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Assign tasks to your clients and track their status. The client is notified when you assign a task.</PageIntro>

          <Label>Assign a task</Label>
          <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3">
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
              className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal">
              <option value="">Select client…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.user_id} value={c.user_id}>{c.name ?? c.email}</option>
              ))}
            </select>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (e.g. Cardio goal)"
              className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
              className="col-span-2 h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
            <Button type="submit" variant="dark" disabled={busy}>{busy ? "Assigning…" : "Assign task"}</Button>
          </form>
          {err && <div className="mt-2 text-[13px] text-coral">{err}</div>}

          <div className="mt-9">
            <Label>Assigned tasks</Label>
            <Hairline className="mt-2" />
            {tasks.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {tasks.error && <div className="py-6 text-[13px] text-coral">{tasks.error}</div>}
            {!tasks.loading && (tasks.data ?? []).length === 0 && (
              <EmptyState title="No tasks yet">Assign your first task above.</EmptyState>
            )}
            {(tasks.data ?? []).map((t) => (
              <div key={t.task_id}>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-sans text-[14px] text-charcoal">{t.type} — {t.description}</div>
                    <div className="mt-1 font-sans text-[11px] text-muted">Due {shortDate(t.due_date)}</div>
                  </div>
                  <Badge tone="neutral">{t.status}</Badge>
                </div>
                <Hairline />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
```

(If `useResource`'s return type doesn't expose `setData`, drop the optimistic `tasks.setData(...)` line and call `tasks` reload instead — verify against `lib/api/useResource.ts` in Step 3.)

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds. If `setData` isn't on the resource, adjust per the note.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/specialist/tasks/page.tsx frontend/app/specialist/layout.tsx
git commit -m "feat(specialist): wellness tasks assignment page (B8)"
```

---

### Task 8: Content page — delete button (B13)

**Files:**
- Modify: `frontend/app/specialist/content/page.tsx`

- [ ] **Step 1: Read the current content page**

Run: `sed -n '1,200p' frontend/app/specialist/content/page.tsx` to find how content rows render and what state holds the list.

- [ ] **Step 2: Import `deleteContent` and add a handler**

Add `deleteContent` to the existing `@/lib/api/specialist` import. Add a handler near the other mutations:

```ts
  const remove = async (id: string) => {
    if (!confirm("Permanently delete this content?")) return;
    try {
      await deleteContent(id);
      // adapt to the page's list state variable:
      setItems((prev) => (prev ?? []).filter((c) => c.content_id !== id));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete");
    }
  };
```

- [ ] **Step 3: Add a Delete button to each content row**

In each content row's action area, add:

```tsx
<Button type="button" variant="ghost" onClick={() => remove(c.content_id)}>Delete</Button>
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/specialist/content/page.tsx
git commit -m "feat(specialist): hard-delete content button (B13)"
```

---

### Task 9: Feedback draft auto-save (B22)

**Files:**
- Modify: `frontend/app/specialist/clients/[id]/page.tsx` (the feedback form)

**Interfaces:**
- Behavior: the feedback textarea persists to `localStorage["onefit-feedback-draft-<clientId>"]` on change and restores on mount; cleared on successful submit.

- [ ] **Step 1: Read the client detail page to find the feedback form**

Run: `grep -n "feedback\|submitFeedback\|textarea\|notes" frontend/app/specialist/clients/[id]/page.tsx`

- [ ] **Step 2: Add draft persistence around the feedback state**

Where the feedback notes state is declared (e.g. `const [notes, setNotes] = useState("")`), replace with a localStorage-backed version (use the route's client id, available via `params` or `useParams`):

```ts
  const draftKey = `onefit-feedback-draft-${clientId}`;
  const [notes, setNotes] = useState("");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
    if (saved) setNotes(saved);
  }, [draftKey]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(draftKey, notes);
  }, [draftKey, notes]);
```

Ensure `useEffect` is imported from `react`. Replace `clientId` with the page's actual id variable.

- [ ] **Step 3: Clear the draft on successful submit**

In the feedback submit handler, after `submitFeedback(...)` succeeds, add:

```ts
      localStorage.removeItem(draftKey);
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/specialist/clients/[id]/page.tsx
git commit -m "feat(specialist): feedback draft auto-save (B22)"
```

---

### Task 10: Admin Registrations page (C6, C7)

**Files:**
- Create: `frontend/app/admin/registrations/page.tsx`
- Modify: `frontend/app/admin/layout.tsx` (nav, add `{ label: "Registrations", href: "/admin/registrations" }` after Users)

**Interfaces:**
- Consumes: `listRegistrations`, `approveRegistration`, `rejectRegistration` (Task 6).

- [ ] **Step 1: Add the nav item**

Add to the nav array in `frontend/app/admin/layout.tsx` after Users:

```ts
  { label: "Registrations", href: "/admin/registrations" },
```

- [ ] **Step 2: Create the page**

Create `frontend/app/admin/registrations/page.tsx`:

```tsx
"use client";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listRegistrations, approveRegistration, rejectRegistration } from "@/lib/api/admin";
import type { UserOut } from "@/lib/api/types";

export default function AdminRegistrationsPage() {
  const { data, error, loading, setData } = useResource<UserOut[]>(listRegistrations, []);

  const decide = async (id: string, kind: "approve" | "reject") => {
    try {
      if (kind === "approve") await approveRegistration(id);
      else {
        const reason = prompt("Reason for rejection (optional):") ?? "";
        await rejectRegistration(id, reason);
      }
      setData((prev) => (prev ?? []).filter((u) => u.user_id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    }
  };

  return (
    <>
      <TopBar title="Pending registrations" search="Search" avatarLetter="A" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Approve or reject members and specialists awaiting access. Approving activates the account; rejecting suspends it.</PageIntro>
          <Hairline className="mt-2" />
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && (data ?? []).length === 0 && (
            <EmptyState title="No pending registrations">Everyone is approved.</EmptyState>
          )}
          {(data ?? []).map((u) => (
            <div key={u.user_id}>
              <div className="flex items-center justify-between py-4">
                <div>
                  <div className="font-sans text-[14px] text-charcoal">{u.name ?? u.email}</div>
                  <div className="mt-1 font-sans text-[11px] text-muted">{u.email} · {u.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{u.status}</Badge>
                  <Button type="button" variant="dark" onClick={() => decide(u.user_id, "approve")}>Approve</Button>
                  <Button type="button" variant="ghost" onClick={() => decide(u.user_id, "reject")}>Reject</Button>
                </div>
              </div>
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/admin/registrations/page.tsx frontend/app/admin/layout.tsx
git commit -m "feat(admin): registration approval page (C6, C7)"
```

---

### Task 11: Admin Programs page (C12)

**Files:**
- Create: `frontend/app/admin/programs/page.tsx`
- Modify: `frontend/app/admin/layout.tsx` (nav, add `{ label: "Programs", href: "/admin/programs" }`)

**Interfaces:**
- Consumes: `listPrograms`, `removeProgram` (Task 6).

- [ ] **Step 1: Add the nav item**

```ts
  { label: "Programs", href: "/admin/programs" },
```

- [ ] **Step 2: Create the page**

Create `frontend/app/admin/programs/page.tsx`:

```tsx
"use client";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listPrograms, removeProgram } from "@/lib/api/admin";
import { shortDate } from "@/lib/format";
import type { ProgramOut } from "@/lib/api/types";

export default function AdminProgramsPage() {
  const { data, error, loading, setData } = useResource<ProgramOut[]>(() => listPrograms(30), []);

  const remove = async (id: string) => {
    if (!confirm("Archive this inactive program? Its scheduled sessions will be marked missed.")) return;
    try {
      await removeProgram(id);
      setData((prev) => (prev ?? []).filter((p) => p.plan_id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    }
  };

  return (
    <>
      <TopBar title="Inactive programs" search="Search" avatarLetter="A" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Programs with no activity in the last 30 days. Archiving keeps history but removes them from active plans.</PageIntro>
          <Hairline className="mt-2" />
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && (data ?? []).length === 0 && (
            <EmptyState title="No inactive programs">Nothing to clean up.</EmptyState>
          )}
          {(data ?? []).map((p) => (
            <div key={p.plan_id}>
              <div className="flex items-center justify-between py-4">
                <div>
                  <div className="font-sans text-[14px] text-charcoal">{p.goal}</div>
                  <div className="mt-1 font-sans text-[11px] text-muted">
                    Created {shortDate(p.created_at)}
                    {p.last_activity_at ? ` · last activity ${shortDate(p.last_activity_at)}` : ""}
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => remove(p.plan_id)}>Archive</Button>
              </div>
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/admin/programs/page.tsx frontend/app/admin/layout.tsx
git commit -m "feat(admin): inactive program removal page (C12)"
```

---

### Task 12: Admin Notifications — compose form (C14)

**Files:**
- Modify: `frontend/app/admin/notifications/page.tsx`

**Interfaces:**
- Consumes: `sendNotification` (Task 6).

- [ ] **Step 1: Read the current notifications page**

Run: `sed -n '1,200p' frontend/app/admin/notifications/page.tsx` to see the existing inbox layout and imports.

- [ ] **Step 2: Add compose state + handler**

Add near the top of the component:

```ts
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("all");
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSendErr(null); setSent(null);
    try {
      await sendNotification({ message: msg.trim(), audience, title: title.trim() || undefined });
      setSent("Notification sent."); setMsg(""); setTitle("");
    } catch (e2) {
      setSendErr(e2 instanceof ApiError ? e2.message : "Failed to send");
    }
  };
```

Ensure imports: `useState` from react, `ApiError` from `@/lib/api/client`, `sendNotification` from `@/lib/api/admin`, and `Button`/`Label`.

- [ ] **Step 3: Render the compose form above the inbox list**

```tsx
<form onSubmit={send} className="mb-8 border border-border bg-white p-5">
  <Label>Compose notification</Label>
  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)"
    className="mt-3 h-[42px] w-full border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
  <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message" rows={3}
    className="mt-3 w-full border border-border px-3 py-2 text-[14px] outline-none focus:border-charcoal" />
  <div className="mt-3 flex items-center gap-3">
    <select value={audience} onChange={(e) => setAudience(e.target.value)}
      className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal">
      <option value="all">Everyone</option>
      <option value="gym_users">Gym users</option>
      <option value="specialists">Specialists</option>
    </select>
    <Button type="submit" variant="dark">Send</Button>
  </div>
  {sendErr && <div className="mt-2 text-[13px] text-coral">{sendErr}</div>}
  {sent && <div className="mt-2 text-[13px] text-good">{sent}</div>}
</form>
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/admin/notifications/page.tsx
git commit -m "feat(admin): compose + send notification UI (C14)"
```

---

### Task 13: Admin user activity monitor UI (C11)

**Files:**
- Modify: `frontend/app/admin/users/page.tsx`

**Interfaces:**
- Consumes: `getUserActivity` (Task 6).

- [ ] **Step 1: Read the users page**

Run: `sed -n '1,200p' frontend/app/admin/users/page.tsx` to find the user-row layout.

- [ ] **Step 2: Add an expandable activity panel**

Add state + loader:

```ts
  const [openId, setOpenId] = useState<string | null>(null);
  const [activity, setActivity] = useState<AdminUserActivity | null>(null);

  const view = async (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id); setActivity(null);
    try { setActivity(await getUserActivity(id)); } catch { setActivity(null); }
  };
```

Import `getUserActivity` from `@/lib/api/admin` and `AdminUserActivity` from `@/lib/api/types`.

- [ ] **Step 3: Add a "View activity" button + panel per row**

In each user row, add a button `<Button variant="ghost" onClick={() => view(u.user_id)}>Activity</Button>` and, when `openId === u.user_id`, render a small panel:

```tsx
{openId === u.user_id && (
  <div className="border border-border bg-cream p-4 text-[13px] text-charcoal">
    {!activity && <Label>Loading…</Label>}
    {activity && (
      <>
        <div>Recent activity logs: {activity.recent_activity.length}</div>
        <div>Recent diet logs: {activity.recent_diet.length}</div>
        <div>Recent progress entries: {activity.recent_progress.length}</div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/admin/users/page.tsx
git commit -m "feat(admin): per-user activity monitor UI (C11)"
```

---

### Task 14: Reports page — show recommendation (B21) + verification + docs

**Files:**
- Modify: `frontend/app/specialist/reports/page.tsx`
- Modify: `docs/feature_verification.md`

- [ ] **Step 1: Read the reports page**

Run: `sed -n '1,200p' frontend/app/specialist/reports/page.tsx` to see how a created trend report renders.

- [ ] **Step 2: Render the recommendation**

The `POST /specialist/health-trends` response now includes `recommendation: string`. Capture it from the create call's return and render it in a highlighted block:

```tsx
{recommendation && (
  <div className="mt-4 border-l-2 border-coral bg-white p-4 text-[14px] text-charcoal">
    <Label>Recommendation</Label>
    <div className="mt-2">{recommendation}</div>
  </div>
)}
```

Add `recommendation` to the create-trend response type (a local inline type or extend the trend type with `recommendation?: string`).

- [ ] **Step 3: Run the full backend suite + frontend build/lint**

Run: `cd backend && python -m pytest -q`
Expected: PASS (new recommendation tests + smoke).
Run: `cd frontend && npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 4: Update the verification doc**

Flip to ✅ (or note reachable-in-UI): B8, B13, B21, B22, C6, C7, C11, C12, C14; update B3 to ✅ "specialists pending until approved".

- [ ] **Step 5: Commit**

```bash
git add frontend/app/specialist/reports/page.tsx docs/feature_verification.md
git commit -m "feat(specialist): show trend recommendation; mark Tier 1 specialist+admin done"
```

---

## Self-Review

**Spec coverage:** B8 (Task 6/7), B13 (Task 1/6/8), B21 (Task 2/3/14), B22 (Task 9), B3 (Task 5), C6/C7 (Task 6/10), C11 (Task 4/6/13), C12 (Task 6/11), C14 (Task 6/12). All Tier-1 specialist+admin items covered. (B17/B18/B19 community + A28/A29 sharing are intentionally deferred to Plan 5.)

**Placeholder scan:** Frontend Tasks 8/9/12/13/14 require reading an existing page first (their Step 1) because those files weren't fully read at plan time — the variable-name adaptations are called out explicitly. All backend code and all new-file frontend pages (Tasks 7/10/11) are complete and exact.

**Type consistency:** `WellnessTaskIn/Out`, `ProgramOut`, `AdminUserActivity` defined in Task 6 match their consumers in Tasks 7/11/13. Wrapper paths (`/specialist/tasks`, `/specialist/content/{id}`, `/admin/registrations`, `/admin/programs`, `/admin/notifications`, `/admin/users/{id}/activity`) match the backend routes. `recommend_from_trends` signature matches its caller in Task 3.
