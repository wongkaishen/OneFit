# Tier 3 — OpenAI AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deferred 501 AI stubs with real OpenAI-powered features — AI workout-plan generation + accept (A4/A5), AI plan/diet target recalculation (A26/B16), AI feedback summaries (D10), and nutrition lookup (A18) — using the OpenAI API (gpt-4o / gpt-4.1 class).

**Architecture:** A single `app/services/ai.py` wraps `AsyncOpenAI`, exposing typed async functions that return parsed JSON via the chat-completions JSON mode. The `/ai` router calls them; **when `OPENAI_API_KEY` is unset every endpoint still returns 501**, preserving the "AI coming soon" contract on un-provisioned environments. AI generation is **stateless** (returns JSON); persistence stays in the gym subsystem — a new `POST /gym/plans/ai-accept` writes the accepted plan + its `exercises` rows (`generated_by='openai'`).

**Tech Stack:** `openai` Python SDK (`AsyncOpenAI`, chat completions JSON mode), FastAPI, async SQLAlchemy, Next.js.

## Global Constraints

- **Provider is OpenAI, NOT Anthropic** (recorded project decision). Key via `OPENAI_API_KEY`; model via `OPENAI_MODEL` (default a gpt-4o / gpt-4.1-class id). Do not import or wire any Anthropic SDK.
- Every `/ai` endpoint must **degrade to 501** (not 500) when `OPENAI_API_KEY` is missing/empty, so `frontend/lib/api/client.ts`'s `501 → "Not implemented yet"` mapping still works on environments without a key. The existing smoke tests assert 501 for `/ai/workout-plan` and `/ai/nutrition/search` **with no key configured in CI** — keep them green.
- `generated_by` is a free-text column; use `'openai'` for AI plans (manual stays `'manual'`).
- After this tier lands, update `CLAUDE.md` + `AGENTS.md` (keep them in sync): AI is no longer universally deferred — only pose/model inference (D13) remains out of scope.
- Backend venv `backend/env/`. Tests `python -m pytest -q`. Frontend `npm run build && npm run lint`.

---

### Task 1: Add openai dependency + config

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/core/config.py`
- Modify: `backend/.env.example`

**Interfaces:**
- Produces: `settings.openai_api_key: str | None`, `settings.openai_model: str`, `settings.ai_enabled: bool` (property).

- [ ] **Step 1: Add the dependency**

Add to `backend/requirements.txt`:

```
openai==1.59.6
```

Run: `cd backend && source env/bin/activate && pip install "openai==1.59.6"`
Expected: installs successfully.

- [ ] **Step 2: Add settings**

In `backend/app/core/config.py`, inside `Settings`, after the Supabase block add:

```python
    # OpenAI ("Codex") — AI features. When openai_api_key is unset, the /ai
    # endpoints return 501 (preserving the "AI coming soon" contract).
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o"
```

And add a property:

```python
    @property
    def ai_enabled(self) -> bool:
        return bool(self.openai_api_key and self.openai_api_key.strip())
```

- [ ] **Step 3: Document the env var**

In `backend/.env.example` add:

```
# OpenAI (AI features). Leave blank to keep AI endpoints returning 501.
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
```

- [ ] **Step 4: Verify import + settings load**

Run: `cd backend && python -c "from app.core.config import get_settings; print(get_settings().ai_enabled)"`
Expected: prints `False` (no key in env) without error.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/core/config.py backend/.env.example
git commit -m "build(backend): add openai SDK + config (key-gated AI)"
```

---

### Task 2: AI service wrapper

**Files:**
- Create: `backend/app/services/ai.py`
- Test: `backend/tests/test_ai_prompts.py`

**Interfaces:**
- Produces:
  - `build_plan_messages(goal: str, profile: dict) -> list[dict]` (pure, tested)
  - `async generate_workout_plan(goal: str, profile: dict) -> dict`
  - `async search_nutrition(query: str) -> dict`
  - `async summarize_feedback(notes: str, context: str) -> str`
  - `async recalculate_targets(profile: dict, recent: dict) -> dict`
  - `AIDisabledError` (raised when no key)

- [ ] **Step 1: Write the failing test for the pure prompt builder**

Create `backend/tests/test_ai_prompts.py`:

```python
from app.services.ai import build_plan_messages


def test_plan_messages_include_goal_and_profile():
    msgs = build_plan_messages("Build strength", {"age": 30, "weight": 70})
    assert msgs[0]["role"] == "system"
    joined = " ".join(m["content"] for m in msgs)
    assert "Build strength" in joined
    assert "json" in joined.lower()  # JSON mode requires the word "json" in the prompt
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_ai_prompts.py -q`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

Create `backend/app/services/ai.py`:

```python
"""OpenAI-backed AI features (SDD §5.1.1).

A thin async wrapper over the OpenAI chat-completions JSON mode. When no API key
is configured, callers get AIDisabledError, which the /ai router maps to HTTP 501
so the "AI coming soon" contract still holds. Prompt builders are pure + tested;
the network calls are exercised manually with a real key.
"""

import json

from app.core.config import get_settings


class AIDisabledError(RuntimeError):
    """Raised when OPENAI_API_KEY is not configured."""


def _client():
    s = get_settings()
    if not s.ai_enabled:
        raise AIDisabledError("OPENAI_API_KEY is not configured")
    from openai import AsyncOpenAI
    return AsyncOpenAI(api_key=s.openai_api_key)


def build_plan_messages(goal: str, profile: dict) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are a certified fitness coach. Produce a safe, progressive "
                "weekly workout plan as JSON with this exact shape: "
                '{"goal": str, "days": [{"day": str, "focus": str, '
                '"exercises": [{"name": str, "sets": int, "reps": int, '
                '"rest_seconds": int, "notes": str}]}]}. Return only JSON.'
            ),
        },
        {
            "role": "user",
            "content": f"Goal: {goal}. Athlete profile (JSON): {json.dumps(profile)}.",
        },
    ]


async def _json_chat(messages: list[dict]) -> dict:
    client = _client()
    model = get_settings().openai_model
    resp = await client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.4,
    )
    return json.loads(resp.choices[0].message.content or "{}")


async def generate_workout_plan(goal: str, profile: dict) -> dict:
    return await _json_chat(build_plan_messages(goal, profile))


async def search_nutrition(query: str) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a nutrition database. For the food described, return JSON "
                '{"food": str, "serving": str, "calories": number, "protein_g": number, '
                '"carbs_g": number, "fat_g": number}. Estimate a typical serving. '
                "Return only JSON."
            ),
        },
        {"role": "user", "content": f"Food: {query}"},
    ]
    return await _json_chat(messages)


async def summarize_feedback(notes: str, context: str) -> str:
    client = _client()
    model = get_settings().openai_model
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a wellness specialist drafting concise, encouraging, professional feedback for a client. 2-4 sentences."},
            {"role": "user", "content": f"Client context: {context}\n\nSpecialist rough notes: {notes}\n\nWrite the polished feedback message."},
        ],
        temperature=0.6,
    )
    return resp.choices[0].message.content or ""


async def recalculate_targets(profile: dict, recent: dict) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a fitness coach. Given the athlete profile and recent "
                "progress, return updated daily targets as JSON "
                '{"calories": number, "protein_g": number, "carbs_g": number, '
                '"fat_g": number, "weekly_sessions": int, "rationale": str}. '
                "Return only JSON."
            ),
        },
        {"role": "user", "content": f"Profile: {json.dumps(profile)}\nRecent: {json.dumps(recent)}"},
    ]
    return await _json_chat(messages)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_ai_prompts.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ai.py backend/tests/test_ai_prompts.py
git commit -m "feat(ai): openai service wrapper (plan, nutrition, feedback, recalc)"
```

---

### Task 3: Rewrite the /ai router to call OpenAI (key-gated)

**Files:**
- Modify: `backend/app/subsystems/ai_integration/router.py`

**Interfaces:**
- Consumes: `app.services.ai` functions; `get_current_user` (any authenticated caller).
- Produces:
  - `POST /ai/workout-plan` `{ goal: str }` → generated plan JSON (501 if AI disabled).
  - `GET /ai/nutrition/search?q=` → nutrition JSON (501 if disabled).
  - `POST /ai/feedback-summary` `{ notes: str, context?: str }` → `{ summary: str }`.
  - `POST /ai/recalculate-targets` `{ profile?: dict, recent?: dict }` → targets JSON.

- [ ] **Step 1: Replace the router body**

Replace the whole contents of `backend/app/subsystems/ai_integration/router.py` with:

```python
"""AI & Integration subsystem (SDD §5.1.1) — OpenAI-backed.

These endpoints call OpenAI when OPENAI_API_KEY is configured; otherwise they
return 501 so the frontend's "AI coming soon" contract still holds.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import CurrentUser, get_current_user
from app.services.ai import (
    AIDisabledError,
    generate_workout_plan,
    recalculate_targets,
    search_nutrition,
    summarize_feedback,
)

router = APIRouter(prefix="/ai", tags=["ai_integration"])

UserDep = Annotated[CurrentUser, Depends(get_current_user)]
_DEFERRED = "AI & Integration subsystem is not configured (no OPENAI_API_KEY); not yet available."


def _deferred() -> HTTPException:
    return HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_DEFERRED)


class GeneratePlanRequest(BaseModel):
    user_id: str | None = None
    goal: str | None = None


class FeedbackSummaryRequest(BaseModel):
    notes: str
    context: str = ""


class RecalcRequest(BaseModel):
    profile: dict[str, Any] = {}
    recent: dict[str, Any] = {}


@router.post("/workout-plan", status_code=status.HTTP_200_OK)
async def workout_plan(body: GeneratePlanRequest, user: UserDep):
    try:
        return await generate_workout_plan(body.goal or "general fitness", {"user_id": user.id})
    except AIDisabledError:
        raise _deferred()


@router.get("/nutrition/search", status_code=status.HTTP_200_OK)
async def nutrition(q: str, user: UserDep):
    try:
        return await search_nutrition(q)
    except AIDisabledError:
        raise _deferred()


@router.post("/feedback-summary")
async def feedback_summary(body: FeedbackSummaryRequest, user: UserDep):
    try:
        return {"summary": await summarize_feedback(body.notes, body.context)}
    except AIDisabledError:
        raise _deferred()


@router.post("/recalculate-targets")
async def recalc(body: RecalcRequest, user: UserDep):
    try:
        return await recalculate_targets(body.profile, body.recent)
    except AIDisabledError:
        raise _deferred()
```

- [ ] **Step 2: Update the smoke tests for the new auth + 501 contract**

The endpoints now require auth, so an anonymous call returns 401/403. With **no key** configured in CI, an authed call would 501. Update `backend/tests/test_smoke.py`:
- `test_ai_workout_plan_is_deferred` and `test_ai_nutrition_search_is_deferred` now hit auth first. Change them to assert the endpoints reject anonymous callers:

```python
def test_ai_workout_plan_requires_auth(client):
    resp = client.post("/ai/workout-plan", json={"goal": "muscle"})
    assert resp.status_code in (401, 403)


def test_ai_nutrition_search_requires_auth(client):
    resp = client.get("/ai/nutrition/search", params={"q": "banana"})
    assert resp.status_code in (401, 403)
```

(Keep `test_openapi_lists_all_subsystems` — `/ai/workout-plan` is still present.)

- [ ] **Step 3: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/ai_integration/router.py backend/tests/test_smoke.py
git commit -m "feat(ai): OpenAI-backed /ai endpoints, key-gated to 501 (A4,A18,A26,D10)"
```

---

### Task 4: Persist an accepted AI plan + exercises (A5)

**Files:**
- Modify: `backend/app/subsystems/gym_user/router.py` (add schema + endpoint after `create_plan`)
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Consumes: `Exercise` model (add to the models import).
- Produces: `POST /gym/plans/ai-accept` body `{ goal: str, exercises: [{name, sets?, reps?, rest_seconds?, notes?}] }` → created plan (`generated_by='openai'`) with its exercise rows.

- [ ] **Step 1: Import the Exercise model**

Add `Exercise` to the `from app.models import (...)` block in `gym_user/router.py`.

- [ ] **Step 2: Add the schema + endpoint**

After `create_plan`, add:

```python
class AIExerciseIn(BaseModel):
    name: str
    sets: int | None = None
    reps: int | None = None
    rest_seconds: int | None = None
    notes: str | None = None


class AIPlanAcceptIn(BaseModel):
    goal: str
    exercises: list[AIExerciseIn] = []


@router.post("/plans/ai-accept", status_code=status.HTTP_201_CREATED)
async def accept_ai_plan(body: AIPlanAcceptIn, user: GymUserDep, db: DbDep):
    """Persist an AI-generated plan the user accepted (A5), with its exercises."""
    plan = WorkoutPlan(
        plan_id=uuid.uuid4(),
        user_id=uuid.UUID(user.id),
        goal=body.goal,
        generated_by="openai",
        status="active",
        created_at=_now(),
    )
    db.add(plan)
    for i, ex in enumerate(body.exercises):
        db.add(Exercise(
            exercise_id=uuid.uuid4(),
            plan_id=plan.plan_id,
            name=ex.name,
            sets=ex.sets,
            reps=ex.reps,
            rest_seconds=ex.rest_seconds,
            order_index=i,
            notes=ex.notes,
            created_at=_now(),
        ))
    await db.commit()
    await db.refresh(plan)
    return plan
```

- [ ] **Step 3: Extend smoke OpenAPI assertion**

Add `"/gym/plans/ai-accept"` to the `expected` list.

- [ ] **Step 4: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/gym_user/router.py backend/tests/test_smoke.py
git commit -m "feat(gym): accept + persist AI workout plan with exercises (A5)"
```

---

### Task 5: Frontend AI wrappers + types

**Files:**
- Create: `frontend/lib/api/ai.ts`
- Modify: `frontend/lib/api/gym.ts`
- Modify: `frontend/lib/api/types.ts`

**Interfaces:**
- Produces: `generateWorkoutPlan`, `searchNutrition`, `feedbackSummary`, `recalcTargets` (ai.ts); `acceptAiPlan` (gym.ts); `AIPlan`, `AIExercise`, `NutritionInfo`, `AITargets` types.

- [ ] **Step 1: Add types**

Append to `frontend/lib/api/types.ts`:

```ts
export interface AIExercise {
  name: string; sets?: number; reps?: number; rest_seconds?: number; notes?: string;
}
export interface AIPlanDay { day: string; focus: string; exercises: AIExercise[]; }
export interface AIPlan { goal: string; days: AIPlanDay[]; }
export interface NutritionInfo {
  food: string; serving: string; calories: number; protein_g: number; carbs_g: number; fat_g: number;
}
export interface AITargets {
  calories: number; protein_g: number; carbs_g: number; fat_g: number; weekly_sessions: number; rationale: string;
}
```

- [ ] **Step 2: Create `ai.ts`**

```ts
import { request } from "./client";
import type { AIPlan, AITargets, NutritionInfo } from "./types";

export const generateWorkoutPlan = (goal: string) =>
  request<AIPlan>("/ai/workout-plan", { method: "POST", body: JSON.stringify({ goal }) });
export const searchNutrition = (q: string) =>
  request<NutritionInfo>(`/ai/nutrition/search?q=${encodeURIComponent(q)}`);
export const feedbackSummary = (notes: string, context = "") =>
  request<{ summary: string }>("/ai/feedback-summary", { method: "POST", body: JSON.stringify({ notes, context }) });
export const recalcTargets = (profile: Record<string, unknown> = {}, recent: Record<string, unknown> = {}) =>
  request<AITargets>("/ai/recalculate-targets", { method: "POST", body: JSON.stringify({ profile, recent }) });
```

- [ ] **Step 3: Add `acceptAiPlan` to `gym.ts`**

```ts
import type { AIExercise } from "./types";
export const acceptAiPlan = (goal: string, exercises: AIExercise[]) =>
  request<WorkoutPlan>("/gym/plans/ai-accept", { method: "POST", body: JSON.stringify({ goal, exercises }) });
```

- [ ] **Step 4: Lint + commit**

Run: `cd frontend && npm run lint` (expect no new errors).

```bash
git add frontend/lib/api/ai.ts frontend/lib/api/gym.ts frontend/lib/api/types.ts
git commit -m "feat(api): AI wrappers (generate, nutrition, summary, recalc, accept)"
```

---

### Task 6: Plans page — Generate with AI + accept/reject (A4, A5)

**Files:**
- Modify: `frontend/app/gym/plans/page.tsx`

**Interfaces:**
- Consumes: `generateWorkoutPlan`, `acceptAiPlan`; handles `ApiError` with `status === 501` → "AI coming soon".

- [ ] **Step 1: Add AI generate state + handlers**

In `GymPlansPage` add:

```ts
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const generate = async () => {
    if (!goal.trim()) return;
    setAiMsg(null); setAiBusy(true);
    try { setAiPlan(await generateWorkoutPlan(goal.trim())); }
    catch (e) { setAiMsg(e instanceof ApiError && e.status === 501 ? "AI coming soon — add an OpenAI key." : "Generation failed."); }
    finally { setAiBusy(false); }
  };

  const acceptAi = async () => {
    if (!aiPlan) return;
    const flat = aiPlan.days.flatMap((d) => d.exercises);
    const plan = await acceptAiPlan(aiPlan.goal, flat);
    setData((prev) => [plan, ...(prev ?? [])]);
    setAiPlan(null);
  };
```

Import `generateWorkoutPlan` from `@/lib/api/ai`, `acceptAiPlan` from `@/lib/api/gym`, and `AIPlan` from `@/lib/api/types`.

- [ ] **Step 2: Add a "Generate with AI" button next to "Create plan"**

In the create form actions:

```tsx
<Button type="button" variant="ghost" disabled={aiBusy || !goal.trim()} onClick={generate}>
  {aiBusy ? "Generating…" : "Generate with AI"}
</Button>
```

- [ ] **Step 3: Render the AI proposal with Accept / Discard**

After the form:

```tsx
{aiMsg && <div className="mt-2 text-[13px] text-coral">{aiMsg}</div>}
{aiPlan && (
  <div className="mt-4 border border-coral bg-white p-5">
    <Label>AI proposed plan — {aiPlan.goal}</Label>
    {aiPlan.days.map((d, i) => (
      <div key={i} className="mt-3">
        <div className="font-sans text-[13px] text-charcoal">{d.day} · {d.focus}</div>
        {d.exercises.map((e, j) => (
          <div key={j} className="font-sans text-[12px] text-muted">
            {e.name}{e.sets ? ` — ${e.sets}×${e.reps}` : ""}
          </div>
        ))}
      </div>
    ))}
    <div className="mt-4 flex gap-2">
      <Button type="button" variant="dark" onClick={acceptAi}>Accept plan</Button>
      <Button type="button" variant="ghost" onClick={() => setAiPlan(null)}>Discard</Button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Build + commit**

Run: `cd frontend && npm run build` (expect success).

```bash
git add frontend/app/gym/plans/page.tsx
git commit -m "feat(gym): generate workout plan with AI + accept/reject (A4, A5)"
```

---

### Task 7: Diet page — AI nutrition search (A18)

**Files:**
- Modify: `frontend/app/gym/diet/page.tsx`

**Interfaces:**
- Consumes: `searchNutrition`; pre-fills the diet form's calories/macros from the result.

- [ ] **Step 1: Read the diet page form**

Run: `grep -n "logDiet\|calories\|protein\|useState\|onSubmit\|food_item" frontend/app/gym/diet/page.tsx`

- [ ] **Step 2: Add a search box that pre-fills the form**

Add state + handler (adapt the setter names to the page's existing form state):

```ts
  const [foodQuery, setFoodQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const lookup = async () => {
    if (!foodQuery.trim()) return;
    setSearchMsg(null); setSearching(true);
    try {
      const n = await searchNutrition(foodQuery.trim());
      // pre-fill the existing diet form fields:
      setFoodItem(n.food); setCalories(String(n.calories));
      setProtein(String(n.protein_g)); setCarbs(String(n.carbs_g)); setFat(String(n.fat_g));
    } catch (e) {
      setSearchMsg(e instanceof ApiError && e.status === 501 ? "AI coming soon — add an OpenAI key." : "Lookup failed.");
    } finally { setSearching(false); }
  };
```

Import `searchNutrition` from `@/lib/api/ai`. Bind `setFoodItem/setCalories/...` to the page's real form setters (Step 1 identifies them).

- [ ] **Step 3: Render the search control above the diet form**

```tsx
<div className="mb-6 flex items-end gap-3">
  <div className="flex flex-1 flex-col gap-2">
    <Label>Search a food (AI)</Label>
    <input value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} placeholder="e.g. 1 banana"
      className="h-[42px] border border-border bg-white px-3 text-[14px] outline-none focus:border-charcoal" />
  </div>
  <Button type="button" variant="ghost" disabled={searching} onClick={lookup}>{searching ? "Searching…" : "Look up"}</Button>
</div>
{searchMsg && <div className="mb-2 text-[13px] text-coral">{searchMsg}</div>}
```

- [ ] **Step 4: Build + commit**

Run: `cd frontend && npm run build` (expect success).

```bash
git add frontend/app/gym/diet/page.tsx
git commit -m "feat(gym): AI nutrition search pre-fills diet log (A18)"
```

---

### Task 8: Feedback AI draft (D10) + verification + docs

**Files:**
- Modify: `frontend/app/specialist/clients/[id]/page.tsx` (feedback form — add an "AI draft" button)
- Modify: `CLAUDE.md`, `AGENTS.md`
- Modify: `docs/feature_verification.md`

**Interfaces:**
- Consumes: `feedbackSummary`.

- [ ] **Step 1: Add an "AI draft" button to the feedback form**

In the client detail page's feedback form, add a button that fills the notes textarea (reusing the `notes`/`setNotes` state, incl. the Plan 2 draft autosave):

```tsx
<Button type="button" variant="ghost" onClick={async () => {
  try {
    const { summary } = await feedbackSummary(notes || "general check-in", `Client ${client?.name ?? ""}`);
    setNotes(summary);
  } catch (e) {
    alert(e instanceof ApiError && e.status === 501 ? "AI coming soon — add an OpenAI key." : "Draft failed.");
  }
}}>AI draft</Button>
```

Import `feedbackSummary` from `@/lib/api/ai`. (`client` is the loaded `ClientSummary` if present; otherwise drop the name.)

- [ ] **Step 2: Update CLAUDE.md + AGENTS.md (keep in sync)**

In both files, change the `ai_integration` bullet from "**DEFERRED**: every endpoint returns 501" to note: AI is OpenAI-backed and **key-gated** — endpoints return 501 only when `OPENAI_API_KEY` is unset; pose/model inference (D13) remains the only deferred AI item. Update the "501 is a feature" convention to "501 is the AI-unconfigured fallback".

- [ ] **Step 3: Full backend suite + frontend build/lint**

Run: `cd backend && python -m pytest -q` (expect PASS).
Run: `cd frontend && npm run build && npm run lint` (expect both succeed).

- [ ] **Step 4: Manual AI smoke (with a key)**

Set `OPENAI_API_KEY` in `backend/.env`, restart uvicorn, and confirm: generate a plan on /gym/plans, look up a food on /gym/diet, AI-draft feedback on a client. Without the key, confirm each shows "AI coming soon".

- [ ] **Step 5: Update the verification doc**

Flip A4, A5, A18, A26, D9, D10, D11, D12 to ✅ (key-gated). Leave D13 (pose) as ⚙️.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/specialist/clients/[id]/page.tsx CLAUDE.md AGENTS.md docs/feature_verification.md
git commit -m "feat(ai): specialist AI feedback draft; docs: AI now key-gated (D10)"
```

---

## Self-Review

**Spec coverage:** A4 (Task 3/6), A5 (Task 4/6), A18 (Task 3/7), A26+B16 recalc (Task 3, exposed via `recalcTargets`; surfacing on a screen is optional polish), D9/D10/D11/D12 (Task 2/3/8). D13 pose inference intentionally left deferred.

**Placeholder scan:** Frontend Tasks 7/8 require reading the page first (Step 1 / inline notes) to bind real form-state setters. All backend code, the AI service, and the router rewrite are complete and exact.

**Type consistency:** `AIPlan/AIExercise/NutritionInfo/AITargets` match the JSON shapes the prompts in `ai.py` request. `acceptAiPlan(goal, exercises)` posts `{goal, exercises}` matching `AIPlanAcceptIn`. The `AIExercise` fields (`name/sets/reps/rest_seconds/notes`) match `AIExerciseIn` and the `Exercise` model columns. 501-gating: `AIDisabledError` → `_deferred()` (501) in every endpoint, preserving the client's `501 → "Not implemented yet"` mapping.

**Note:** the existing smoke tests' 501 assertions are intentionally changed to auth assertions (Task 3 Step 2) because the endpoints now require authentication; with no key, an *authenticated* call returns 501, but smoke tests run unauthenticated.
