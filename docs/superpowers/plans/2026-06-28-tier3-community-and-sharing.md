# Tier 3 — Community & In-App Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the community subsystem usable end-to-end — specialist community monitoring (B17), post moderation (B18), and posting updates (B19) — and replace the absent external social sharing with in-app community sharing + a generated share graphic (A28, A29).

**Architecture:** The backend already has specialist-side community **reads** + `moderate`. This plan adds the missing **writes**: specialists create groups and post updates; gym users list/read/post to groups (sharing progress = creating a community post). Two new frontend pages (`/specialist/community`, `/gym/community`) plus progress-page sharing. The share **graphic** (A29) is generated client-side on a `<canvas>` (no backend, no external service).

**Tech Stack:** FastAPI + async SQLAlchemy, Next.js 14, HTML `<canvas>` for the graphic.

## Global Constraints

- `community_posts.status` enum: `('Posted','Flagged','UnderReview','Approved','Removed','Escalated')`, default `Posted`. `severity`: `('low','medium','high')`. Do not invent values.
- Groups are specialist-owned (`community_groups.specialist_id`). MVP visibility: **any gym user may read and post to any group**; moderation remains restricted to the group-owning specialist (existing `moderate_post` already enforces this).
- No schema change — all tables/columns already exist.
- "Share" is **in-app only** (community feed + downloadable graphic). No Instagram/WhatsApp integration.
- Frontend HTTP via typed wrappers only. Backend venv `backend/env/`; tests `python -m pytest -q`; frontend `npm run build && npm run lint`.

---

### Task 1: Specialist — create group + post update endpoints (B19)

**Files:**
- Modify: `backend/app/subsystems/wellness_specialist/router.py` (near the community section ~line 645)
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Produces:
  - `POST /specialist/community/groups` `{ name: str, description?: str }` → created group.
  - `POST /specialist/community/groups/{group_id}/posts` `{ content: str }` → created post (`status='Posted'`, author = specialist).

- [ ] **Step 1: Add schemas + endpoints**

In the community section of `wellness_specialist/router.py`, add:

```python
class GroupIn(BaseModel):
    name: str
    description: str | None = None


class CommunityPostIn(BaseModel):
    content: str


@router.post("/community/groups", status_code=status.HTTP_201_CREATED)
async def create_group(body: GroupIn, user: SpecialistDep, db: DbDep):
    """Create a community group owned by this specialist (B19)."""
    if not body.name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name is required")
    group = CommunityGroup(
        group_id=uuid.uuid4(), name=body.name.strip(),
        description=body.description, specialist_id=uuid.UUID(user.id),
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return {"group_id": group.group_id, "name": group.name, "description": group.description}


@router.post("/community/groups/{group_id}/posts", status_code=status.HTTP_201_CREATED)
async def create_group_post(group_id: uuid.UUID, body: CommunityPostIn, user: SpecialistDep, db: DbDep):
    """Specialist posts a community update to a group they own (B19)."""
    group = await db.get(CommunityGroup, group_id)
    if group is None or group.specialist_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if not body.content.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="content is required")
    post = CommunityPost(
        post_id=uuid.uuid4(), group_id=group_id, author_id=uuid.UUID(user.id),
        content=body.content.strip(), status="Posted",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post
```

- [ ] **Step 2: Extend smoke OpenAPI assertion**

Add `"/specialist/community/groups"` to the `expected` list.

- [ ] **Step 3: Run smoke tests**

Run: `cd backend && source env/bin/activate && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/wellness_specialist/router.py backend/tests/test_smoke.py
git commit -m "feat(specialist): create community group + post update (B19)"
```

---

### Task 2: Gym — community list/read/post endpoints (A28)

**Files:**
- Modify: `backend/app/subsystems/gym_user/router.py`
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Consumes: `CommunityGroup`, `CommunityPost` (add to models import).
- Produces:
  - `GET /gym/community/groups` → all groups.
  - `GET /gym/community/groups/{group_id}/posts` → visible posts (excludes `Removed`).
  - `POST /gym/community/groups/{group_id}/posts` `{ content: str }` → created post (author = gym user).

- [ ] **Step 1: Add imports**

Add `CommunityGroup, CommunityPost` to the `from app.models import (...)` block in `gym_user/router.py`.

- [ ] **Step 2: Add the endpoints (after the sessions section)**

```python
class CommunityPostIn(BaseModel):
    content: str


@router.get("/community/groups")
async def gym_list_groups(user: GymUserDep, db: DbDep):
    rows = (await db.execute(select(CommunityGroup).order_by(CommunityGroup.name))).scalars().all()
    return [{"group_id": g.group_id, "name": g.name, "description": g.description} for g in rows]


@router.get("/community/groups/{group_id}/posts")
async def gym_list_posts(group_id: uuid.UUID, user: GymUserDep, db: DbDep):
    if await db.get(CommunityGroup, group_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    rows = (await db.execute(
        select(CommunityPost)
        .where(CommunityPost.group_id == group_id, CommunityPost.status != "Removed")
        .order_by(CommunityPost.created_at.desc())
    )).scalars().all()
    return rows


@router.post("/community/groups/{group_id}/posts", status_code=status.HTTP_201_CREATED)
async def gym_create_post(group_id: uuid.UUID, body: CommunityPostIn, user: GymUserDep, db: DbDep):
    """Gym user posts to a group — also the target of 'share progress' (A28)."""
    if await db.get(CommunityGroup, group_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if not body.content.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="content is required")
    post = CommunityPost(
        post_id=uuid.uuid4(), group_id=group_id, author_id=uuid.UUID(user.id),
        content=body.content.strip(), status="Posted",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post
```

Note: `CommunityPost` has no `created_at` mapped? It does (see model lines 313+); confirm the column ordering exposes `created_at`. If `CommunityPost` lacks `created_at` in the ORM, order by `post_id` instead — verify by reading the model before this step.

- [ ] **Step 3: Extend smoke OpenAPI assertion**

Add `"/gym/community/groups"` to the `expected` list.

- [ ] **Step 4: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/gym_user/router.py backend/tests/test_smoke.py
git commit -m "feat(gym): community list/read/post endpoints (A28)"
```

---

### Task 3: Frontend wrappers + types (community)

**Files:**
- Modify: `frontend/lib/api/types.ts`, `frontend/lib/api/specialist.ts`, `frontend/lib/api/gym.ts`

**Interfaces:**
- Produces types `CommunityGroup`, `CommunityPost`; specialist `listGroups`, `createGroup`, `listGroupPosts`, `createGroupPost`, `moderatePost`; gym `gymListGroups`, `gymListPosts`, `gymCreatePost`.

- [ ] **Step 1: Add types**

Append to `frontend/lib/api/types.ts`:

```ts
export interface CommunityGroup { group_id: string; name: string; description: string | null; }
export interface CommunityPost {
  post_id: string; group_id: string; author_id: string; content: string;
  status: string; severity: string | null; created_at?: string;
}
```

- [ ] **Step 2: Specialist wrappers**

In `specialist.ts` add (import the new types):

```ts
export const listGroups = () => request<CommunityGroup[]>("/specialist/community/groups");
export const createGroup = (name: string, description?: string) =>
  request<CommunityGroup>("/specialist/community/groups", { method: "POST", body: JSON.stringify({ name, description }) });
export const listGroupPosts = (id: string) =>
  request<CommunityPost[]>(`/specialist/community/groups/${id}/posts`);
export const createGroupPost = (id: string, content: string) =>
  request<CommunityPost>(`/specialist/community/groups/${id}/posts`, { method: "POST", body: JSON.stringify({ content }) });
export const moderatePost = (id: string, action: "remove" | "warn" | "escalate", severity?: string) =>
  request<CommunityPost>(`/specialist/community/posts/${id}/moderate`, { method: "POST", body: JSON.stringify({ action, severity }) });
```

(`GET /specialist/community/groups` is the existing read endpoint — it returns `[{group_id,name,description}]`, matching `CommunityGroup`.)

- [ ] **Step 3: Gym wrappers**

In `gym.ts` add (import the new types):

```ts
export const gymListGroups = () => request<CommunityGroup[]>("/gym/community/groups");
export const gymListPosts = (id: string) => request<CommunityPost[]>(`/gym/community/groups/${id}/posts`);
export const gymCreatePost = (id: string, content: string) =>
  request<CommunityPost>(`/gym/community/groups/${id}/posts`, { method: "POST", body: JSON.stringify({ content }) });
```

- [ ] **Step 4: Lint + commit**

Run: `cd frontend && npm run lint` (expect no new errors).

```bash
git add frontend/lib/api/types.ts frontend/lib/api/specialist.ts frontend/lib/api/gym.ts
git commit -m "feat(api): community wrappers (specialist + gym)"
```

---

### Task 4: Specialist Community page (B17, B18, B19)

**Files:**
- Create: `frontend/app/specialist/community/page.tsx`
- Modify: `frontend/app/specialist/layout.tsx` (nav: `{ label: "Community", href: "/specialist/community" }`)

**Interfaces:**
- Consumes: `listGroups`, `createGroup`, `listGroupPosts`, `createGroupPost`, `moderatePost`.

- [ ] **Step 1: Add the nav item**

Add `{ label: "Community", href: "/specialist/community" }` to `app/specialist/layout.tsx`.

- [ ] **Step 2: Create the page**

Create `frontend/app/specialist/community/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { listGroups, createGroup, listGroupPosts, createGroupPost, moderatePost } from "@/lib/api/specialist";
import type { CommunityGroup, CommunityPost } from "@/lib/api/types";

export default function SpecialistCommunityPage() {
  const groups = useResource<CommunityGroup[]>(listGroups, []);
  const [active, setActive] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    if (!active) return;
    listGroupPosts(active).then(setPosts).catch(() => setPosts([]));
  }, [active]);

  const addGroup = async () => {
    if (!newGroup.trim()) return;
    const g = await createGroup(newGroup.trim());
    groups.setData((prev) => [...(prev ?? []), g]); setNewGroup("");
  };
  const addPost = async () => {
    if (!active || !newPost.trim()) return;
    const p = await createGroupPost(active, newPost.trim());
    setPosts((prev) => [p, ...prev]); setNewPost("");
  };
  const moderate = async (id: string, action: "remove" | "warn" | "escalate") => {
    const updated = await moderatePost(id, action, action === "escalate" ? "high" : "low");
    setPosts((prev) => prev.map((p) => (p.post_id === id ? updated : p)));
  };

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Create groups, post updates, and moderate member posts.</PageIntro>

          <div className="mb-6 flex items-end gap-3">
            <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New group name"
              className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
            <Button type="button" variant="dark" onClick={addGroup}>Create group</Button>
          </div>

          <div className="flex gap-2">
            {(groups.data ?? []).map((g) => (
              <Button key={g.group_id} type="button" variant={active === g.group_id ? "dark" : "ghost"}
                onClick={() => setActive(g.group_id)}>{g.name}</Button>
            ))}
          </div>

          {active && (
            <div className="mt-6">
              <div className="flex items-end gap-3">
                <input value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Post an update…"
                  className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
                <Button type="button" variant="dark" onClick={addPost}>Post</Button>
              </div>
              <Hairline className="mt-4" />
              {posts.map((p) => (
                <div key={p.post_id}>
                  <div className="flex items-center justify-between py-4">
                    <div className="font-sans text-[14px] text-charcoal">{p.content}</div>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.status === "Removed" ? "neutral" : "good"}>{p.status}</Badge>
                      <Button type="button" variant="ghost" onClick={() => moderate(p.post_id, "warn")}>Flag</Button>
                      <Button type="button" variant="ghost" onClick={() => moderate(p.post_id, "remove")}>Remove</Button>
                      <Button type="button" variant="ghost" onClick={() => moderate(p.post_id, "escalate")}>Escalate</Button>
                    </div>
                  </div>
                  <Hairline />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Build + commit**

Run: `cd frontend && npm run build` (expect success; if `groups.setData` isn't exposed, reload via the resource instead).

```bash
git add frontend/app/specialist/community/page.tsx frontend/app/specialist/layout.tsx
git commit -m "feat(specialist): community monitor/moderate/post page (B17, B18, B19)"
```

---

### Task 5: Gym Community page (A28)

**Files:**
- Create: `frontend/app/gym/community/page.tsx`
- Modify: `frontend/app/gym/layout.tsx` (nav: `{ label: "Community", href: "/gym/community" }`)

**Interfaces:**
- Consumes: `gymListGroups`, `gymListPosts`, `gymCreatePost`.

- [ ] **Step 1: Add the nav item**

Add `{ label: "Community", href: "/gym/community" }` to `app/gym/layout.tsx` (before Notifications).

- [ ] **Step 2: Create the page**

Mirror the specialist community page but without moderation: list groups (`gymListGroups`), select one, list posts (`gymListPosts`), and a post box calling `gymCreatePost`. Reuse the same component structure (TopBar `avatarLetter="G"`, no Flag/Remove/Escalate buttons). Support an optional `?share=<text>` query param: if present, pre-fill the post box (so "Share to community" from the progress page deep-links here).

```tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { gymListGroups, gymListPosts, gymCreatePost } from "@/lib/api/gym";
import type { CommunityGroup, CommunityPost } from "@/lib/api/types";

export default function GymCommunityPage() {
  const groups = useResource<CommunityGroup[]>(gymListGroups, []);
  const params = useSearchParams();
  const [active, setActive] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [text, setText] = useState(params.get("share") ?? "");

  useEffect(() => { if (active) gymListPosts(active).then(setPosts).catch(() => setPosts([])); }, [active]);

  const post = async () => {
    if (!active || !text.trim()) return;
    const p = await gymCreatePost(active, text.trim());
    setPosts((prev) => [p, ...prev]); setText("");
  };

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Share your progress and connect with other members.</PageIntro>
          <div className="flex flex-wrap gap-2">
            {(groups.data ?? []).map((g) => (
              <Button key={g.group_id} type="button" variant={active === g.group_id ? "dark" : "ghost"}
                onClick={() => setActive(g.group_id)}>{g.name}</Button>
            ))}
          </div>
          {!active && <div className="mt-4"><Label>Select a group to view posts.</Label></div>}
          {active && (
            <div className="mt-6">
              <div className="flex items-end gap-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something…"
                  className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
                <Button type="button" variant="dark" onClick={post}>Post</Button>
              </div>
              <Hairline className="mt-4" />
              {posts.map((p) => (
                <div key={p.post_id}>
                  <div className="py-4 font-sans text-[14px] text-charcoal">{p.content}</div>
                  <Hairline />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Build + commit**

Run: `cd frontend && npm run build` (expect success).

```bash
git add frontend/app/gym/community/page.tsx frontend/app/gym/layout.tsx
git commit -m "feat(gym): community feed + posting (A28)"
```

---

### Task 6: Progress page — share to community + share graphic (A28, A29)

**Files:**
- Create: `frontend/lib/shareGraphic.ts`
- Modify: `frontend/app/gym/progress/page.tsx`

**Interfaces:**
- Produces: `renderShareGraphic(summary: { line1: string; line2: string }): string` → returns a PNG data URL drawn on an offscreen canvas.

- [ ] **Step 1: Create the graphic generator**

Create `frontend/lib/shareGraphic.ts`:

```ts
/** Draw a branded OneFit progress card to a canvas and return a PNG data URL (A29). */
export function renderShareGraphic(summary: { line1: string; line2: string }): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#F5F1EA"; ctx.fillRect(0, 0, 1080, 1080);          // cream
  ctx.fillStyle = "#E5573F"; ctx.fillRect(0, 0, 1080, 16);            // coral bar
  ctx.fillStyle = "#2B2B2B";                                          // charcoal
  ctx.font = "700 64px Inter, sans-serif";
  ctx.fillText("OneFit", 80, 160);
  ctx.font = "400 88px 'EB Garamond', serif";
  ctx.fillText(summary.line1, 80, 520);
  ctx.font = "400 48px Inter, sans-serif";
  ctx.fillStyle = "#6B6B6B";
  ctx.fillText(summary.line2, 80, 620);
  ctx.fillStyle = "#E5573F";
  ctx.fillText("My progress", 80, 980);
  return canvas.toDataURL("image/png");
}
```

- [ ] **Step 2: Wire share-to-community + download-graphic into the progress page**

In `frontend/app/gym/progress/page.tsx`, replace (or augment) the existing `share` handler so it offers two real targets. Import `useRouter` from `next/navigation` and `renderShareGraphic` from `@/lib/shareGraphic`. Add:

```ts
  const router = useRouter();
  const shareToCommunity = () => {
    const text = buildSummaryText(); // the page already builds a summary string — reuse it
    router.push(`/gym/community?share=${encodeURIComponent(text)}`);
  };
  const downloadGraphic = () => {
    const url = renderShareGraphic({ line1: latestWeightLabel(), line2: trendLabel() });
    const a = document.createElement("a");
    a.href = url; a.download = "onefit-progress.png"; a.click();
  };
```

Bind `buildSummaryText`/`latestWeightLabel`/`trendLabel` to the page's existing summary-building code (Step 1 of reading; the page already composes a multi-line summary — extract the pieces).

- [ ] **Step 3: Add the two buttons (keep the existing native-share fallback)**

```tsx
<Button type="button" variant="dark" onClick={shareToCommunity}>Share to community</Button>
<Button type="button" variant="ghost" onClick={downloadGraphic}>Download graphic</Button>
```

- [ ] **Step 4: Build + commit**

Run: `cd frontend && npm run build` (expect success).

```bash
git add frontend/lib/shareGraphic.ts frontend/app/gym/progress/page.tsx
git commit -m "feat(gym): share progress to community + generated graphic (A28, A29)"
```

---

### Task 7: Verification + docs

**Files:**
- Modify: `docs/feature_verification.md`

- [ ] **Step 1: Backend suite + frontend build/lint**

Run: `cd backend && python -m pytest -q` (expect PASS).
Run: `cd frontend && npm run build && npm run lint` (expect both succeed).

- [ ] **Step 2: Manual click-through**

With a running stack: as a specialist create a group + post + moderate; as a gym user view the group, post, and from the progress page "Share to community" (lands on community with prefilled text) and "Download graphic" (saves a PNG).

- [ ] **Step 3: Update the verification doc**

Flip B17, B18, B19 to ✅; A28 to ✅ (in-app community sharing); A29 to ✅ (generated graphic). Note external social (Instagram/WhatsApp) is intentionally out of scope.

- [ ] **Step 4: Commit**

```bash
git add docs/feature_verification.md
git commit -m "docs: mark community + sharing complete (B17,B18,B19,A28,A29)"
```

---

## Self-Review

**Spec coverage:** B17 (Task 4 monitor), B18 (Task 4 moderate, existing endpoint), B19 (Task 1/4), A28 (Task 2/5/6), A29 (Task 6). All Tier-5 items covered.

**Placeholder scan:** Task 2 Step 2 flags verifying `CommunityPost.created_at` before ordering by it; Task 6 binds to the progress page's existing summary helpers (read-first). Specialist/gym community pages are complete new files. All backend code is exact.

**Type consistency:** `CommunityGroup`/`CommunityPost` types match the backend return shapes (group dict `{group_id,name,description}`; post = ORM row). `moderatePost` action union matches the backend `ModerateIn.action` ('remove'|'warn'|'escalate'). Gym + specialist post bodies both send `{ content }` matching `CommunityPostIn`.
