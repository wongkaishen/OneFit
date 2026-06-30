# Tier 4 — Consultation Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing consultation/messaging feature (B15) — direct messages between a gym user and their wellness specialist, with a notification on each new message.

**Architecture:** A new `public.messages` table + ORM model, a small `messages` subsystem router mounted at `/messages` (uses `get_current_user`, so both gym users and specialists share it), and one messaging page per actor (`/gym/messages`, `/specialist/messages`). Sending a message queues a notification to the recipient via the existing `notify()` service.

**Tech Stack:** FastAPI + async SQLAlchemy, new SQL migration `0013_messages.sql`, Next.js 14.

## Global Constraints

- Schema source of truth is SQL. Add `0013_messages.sql` **and** the ORM model together; no `create_all`/Alembic.
- The backend uses the service-role key and bypasses RLS; `messages` RLS policies are defense-in-depth (mirror `0002_rls.sql`).
- A message is only allowed between users with an **active `specialist_clients` relationship** (either direction) — enforce server-side so messaging can't be used to spam arbitrary users.
- Register the new model in `app/models/__init__.py` and mount the router in `app/main.py`.
- Apply the migration to Supabase project `cnsbxqinucvgiqknqwex` before manual testing.
- Backend venv `backend/env/`; tests `python -m pytest -q`; frontend `npm run build && npm run lint`.

---

### Task 1: Messages table migration

**Files:**
- Create: `backend/supabase/migrations/0013_messages.sql`

- [ ] **Step 1: Write the migration**

Create `backend/supabase/migrations/0013_messages.sql`:

```sql
-- 0013: direct consultation messages between a gym user and their specialist (B15).

create table if not exists public.messages (
    message_id   uuid primary key default gen_random_uuid(),
    sender_id    uuid not null references public.profiles (id) on delete cascade,
    recipient_id uuid not null references public.profiles (id) on delete cascade,
    body         text not null,
    read_at      timestamptz,
    created_at   timestamptz not null default now()
);
create index if not exists messages_pair_idx
    on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_recipient_idx
    on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

-- Defense-in-depth: a participant may read their own threads; only the sender writes.
create policy "messages - participant reads" on public.messages for select
    using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages - sender writes" on public.messages for insert
    with check (sender_id = auth.uid());
```

- [ ] **Step 2: Apply to Supabase**

Apply `0013_messages.sql` to project `cnsbxqinucvgiqknqwex` (Supabase MCP `apply_migration` name `0013_messages`, or SQL editor).
Expected: `public.messages` exists (`select count(*) from public.messages;` returns 0).

- [ ] **Step 3: Commit**

```bash
git add backend/supabase/migrations/0013_messages.sql
git commit -m "feat(messaging): messages table (B15)"
```

---

### Task 2: Message ORM model + export

**Files:**
- Modify: `backend/app/models/entities.py`
- Modify: `backend/app/models/__init__.py`

**Interfaces:**
- Produces: `Message` model (`message_id, sender_id, recipient_id, body, read_at, created_at`).

- [ ] **Step 1: Add the model**

At the end of `backend/app/models/entities.py`, add:

```python
# --- Consultation messages (B15; table from 0013_messages.sql) --------------
class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    body: Mapped[str] = mapped_column(Text)
    read_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
```

- [ ] **Step 2: Export it**

In `backend/app/models/__init__.py`, add `Message,` to both the `from app.models.entities import (...)` block and the `__all__` list.

- [ ] **Step 3: Verify import**

Run: `cd backend && source env/bin/activate && python -c "from app.models import Message; print(Message.__tablename__)"`
Expected: prints `messages`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/entities.py backend/app/models/__init__.py
git commit -m "feat(messaging): Message ORM model"
```

---

### Task 3: Messages subsystem router

**Files:**
- Create: `backend/app/subsystems/messaging/__init__.py` (empty)
- Create: `backend/app/subsystems/messaging/router.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Produces:
  - `GET /messages/threads` → `[{ partner_id, partner_name, last_body, last_at, unread }]`.
  - `GET /messages/{partner_id}` → ordered messages, and marks inbound ones read.
  - `POST /messages` `{ recipient_id: uuid, body: str }` → created message (+ notifies recipient).

- [ ] **Step 1: Create the router**

Create `backend/app/subsystems/messaging/router.py`:

```python
"""Consultation messaging (B15).

Direct messages between a gym user and their wellness specialist. Shared by both
actors via get_current_user; an active specialist_clients relationship is required
in either direction.
"""

import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import Message, Profile, SpecialistClient
from app.services.notification import notify

router = APIRouter(prefix="/messages", tags=["messaging"])

UserDep = Annotated[CurrentUser, Depends(get_current_user)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class MessageIn(BaseModel):
    recipient_id: uuid.UUID
    body: str


async def _assert_related(db: AsyncSession, a: uuid.UUID, b: uuid.UUID) -> None:
    """Require an active specialist_clients link between a and b (either direction)."""
    rel = (await db.execute(
        select(SpecialistClient.specialist_id).where(
            SpecialistClient.status == "active",
            or_(
                (SpecialistClient.specialist_id == a) & (SpecialistClient.client_id == b),
                (SpecialistClient.specialist_id == b) & (SpecialistClient.client_id == a),
            ),
        )
    )).first()
    if rel is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No consultation relationship with this user")


@router.get("/threads")
async def list_threads(user: UserDep, db: DbDep):
    me = uuid.UUID(user.id)
    rows = (await db.execute(
        select(Message).where(or_(Message.sender_id == me, Message.recipient_id == me))
        .order_by(Message.created_at.desc())
    )).scalars().all()
    threads: dict[uuid.UUID, dict] = {}
    for m in rows:
        partner = m.recipient_id if m.sender_id == me else m.sender_id
        if partner not in threads:
            threads[partner] = {"partner_id": partner, "last_body": m.body, "last_at": m.created_at, "unread": 0}
        if m.recipient_id == me and m.read_at is None:
            threads[partner]["unread"] += 1
    # attach partner names
    for pid, t in threads.items():
        p = await db.get(Profile, pid)
        t["partner_name"] = p.name if p else None
    return list(threads.values())


@router.get("/{partner_id}")
async def get_thread(partner_id: uuid.UUID, user: UserDep, db: DbDep):
    me = uuid.UUID(user.id)
    msgs = (await db.execute(
        select(Message).where(
            or_(
                (Message.sender_id == me) & (Message.recipient_id == partner_id),
                (Message.sender_id == partner_id) & (Message.recipient_id == me),
            )
        ).order_by(Message.created_at)
    )).scalars().all()
    for m in msgs:
        if m.recipient_id == me and m.read_at is None:
            m.read_at = _now()
    await db.commit()
    return msgs


@router.post("", status_code=status.HTTP_201_CREATED)
async def send_message(body: MessageIn, user: UserDep, db: DbDep):
    me = uuid.UUID(user.id)
    if not body.body.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="body is required")
    await _assert_related(db, me, body.recipient_id)
    msg = Message(
        message_id=uuid.uuid4(), sender_id=me, recipient_id=body.recipient_id,
        body=body.body.strip(), created_at=_now(),
    )
    db.add(msg)
    await notify(
        db, recipient_id=body.recipient_id, type="message",
        title=f"New message from {user.name or 'your contact'}",
        body=body.body.strip(), ref_type="message", ref_id=msg.message_id,
    )
    await db.commit()
    await db.refresh(msg)
    return msg
```

- [ ] **Step 2: Create the package init**

Create empty `backend/app/subsystems/messaging/__init__.py`.

- [ ] **Step 3: Mount the router**

In `backend/app/main.py`, add the import:

```python
from app.subsystems.messaging.router import router as messaging_router
```

and below `app.include_router(notifications_router)`:

```python
app.include_router(messaging_router)
```

- [ ] **Step 4: Extend smoke tests**

In `test_openapi_lists_all_subsystems` add `"/messages/threads"`. In `test_protected_endpoints_reject_anonymous` add `("get", "/messages/threads")`.

- [ ] **Step 5: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/subsystems/messaging/ backend/app/main.py backend/tests/test_smoke.py
git commit -m "feat(messaging): /messages router (threads, thread, send) (B15)"
```

---

### Task 4: Frontend wrappers + types

**Files:**
- Create: `frontend/lib/api/messages.ts`
- Modify: `frontend/lib/api/types.ts`

**Interfaces:**
- Produces: `Message`, `MessageThread` types; `listThreads`, `getThread`, `sendMessage`.

- [ ] **Step 1: Add types**

Append to `frontend/lib/api/types.ts`:

```ts
export interface Message {
  message_id: string; sender_id: string; recipient_id: string;
  body: string; read_at: string | null; created_at: string;
}
export interface MessageThread {
  partner_id: string; partner_name: string | null;
  last_body: string; last_at: string; unread: number;
}
```

- [ ] **Step 2: Create `messages.ts`**

```ts
import { request } from "./client";
import type { Message, MessageThread } from "./types";

export const listThreads = () => request<MessageThread[]>("/messages/threads");
export const getThread = (partnerId: string) => request<Message[]>(`/messages/${partnerId}`);
export const sendMessage = (recipientId: string, body: string) =>
  request<Message>("/messages", { method: "POST", body: JSON.stringify({ recipient_id: recipientId, body }) });
```

- [ ] **Step 3: Lint + commit**

Run: `cd frontend && npm run lint` (expect no new errors).

```bash
git add frontend/lib/api/messages.ts frontend/lib/api/types.ts
git commit -m "feat(api): messaging wrappers"
```

---

### Task 5: Messaging page component (shared) + gym route

**Files:**
- Create: `frontend/components/Messaging.tsx`
- Create: `frontend/app/gym/messages/page.tsx`
- Modify: `frontend/app/gym/layout.tsx` (nav: `{ label: "Messages", href: "/gym/messages" }`)

**Interfaces:**
- Produces: `<Messaging avatarLetter="G" />` reusable two-pane thread view.

- [ ] **Step 1: Create the shared component**

Create `frontend/components/Messaging.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { listThreads, getThread, sendMessage } from "@/lib/api/messages";
import type { Message, MessageThread } from "@/lib/api/types";

export function Messaging({ avatarLetter }: { avatarLetter: string }) {
  const threads = useResource<MessageThread[]>(listThreads, []);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");

  useEffect(() => { if (active) getThread(active).then(setMsgs).catch(() => setMsgs([])); }, [active]);

  const send = async () => {
    if (!active || !text.trim()) return;
    const m = await sendMessage(active, text.trim());
    setMsgs((prev) => [...prev, m]); setText("");
  };

  return (
    <>
      <TopBar title="Messages" search="Search" avatarLetter={avatarLetter} />
      <main className="flex-1 overflow-auto">
        <div className="flex h-full">
          <div className="w-72 border-r border-border">
            <div className="px-5 py-4"><Label>Conversations</Label></div>
            {(threads.data ?? []).length === 0 && <div className="px-5"><Label>No conversations yet.</Label></div>}
            {(threads.data ?? []).map((t) => (
              <button key={t.partner_id} onClick={() => setActive(t.partner_id)}
                className={`block w-full px-5 py-3 text-left ${active === t.partner_id ? "bg-cream" : ""}`}>
                <div className="font-sans text-[14px] text-charcoal">{t.partner_name ?? "Contact"}</div>
                <div className="truncate font-sans text-[12px] text-muted">{t.last_body}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col">
            {!active ? (
              <div className="p-9"><PageIntro>Select a conversation to start messaging.</PageIntro></div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-6">
                  {msgs.map((m) => (
                    <div key={m.message_id} className="mb-3">
                      <div className="font-sans text-[14px] text-charcoal">{m.body}</div>
                    </div>
                  ))}
                </div>
                <Hairline />
                <div className="flex items-end gap-3 p-4">
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…"
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
                  <Button type="button" variant="dark" onClick={send}>Send</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Create the gym route + nav**

Create `frontend/app/gym/messages/page.tsx`:

```tsx
"use client";
import { Messaging } from "@/components/Messaging";
export default function GymMessagesPage() { return <Messaging avatarLetter="G" />; }
```

Add `{ label: "Messages", href: "/gym/messages" }` to `app/gym/layout.tsx`.

- [ ] **Step 3: Build + commit**

Run: `cd frontend && npm run build` (expect success).

```bash
git add frontend/components/Messaging.tsx frontend/app/gym/messages/page.tsx frontend/app/gym/layout.tsx
git commit -m "feat(gym): consultation messaging page (B15)"
```

---

### Task 6: Specialist messaging route + start-conversation from client detail

**Files:**
- Create: `frontend/app/specialist/messages/page.tsx`
- Modify: `frontend/app/specialist/layout.tsx` (nav: `{ label: "Messages", href: "/specialist/messages" }`)
- Modify: `frontend/app/specialist/clients/[id]/page.tsx` (add a "Message" deep-link)
- Modify: `docs/feature_verification.md`

- [ ] **Step 1: Create the specialist route + nav**

Create `frontend/app/specialist/messages/page.tsx`:

```tsx
"use client";
import { Messaging } from "@/components/Messaging";
export default function SpecialistMessagesPage() { return <Messaging avatarLetter="S" />; }
```

Add `{ label: "Messages", href: "/specialist/messages" }` to `app/specialist/layout.tsx`.

- [ ] **Step 2: Add a "Message client" action on the client detail page**

In `frontend/app/specialist/clients/[id]/page.tsx`, add a button that sends a first message inline (so a thread exists), e.g. a small form calling `sendMessage(clientId, text)` from `@/lib/api/messages`; or simply link to `/specialist/messages`. Minimal version — a button:

```tsx
<Button type="button" variant="ghost" onClick={async () => {
  const text = prompt("Message to client:");
  if (text) { await sendMessage(clientId, text); alert("Message sent."); }
}}>Message client</Button>
```

Import `sendMessage` from `@/lib/api/messages`; `clientId` is the route id already used on the page.

- [ ] **Step 3: Backend suite + frontend build/lint**

Run: `cd backend && python -m pytest -q` (expect PASS).
Run: `cd frontend && npm run build && npm run lint` (expect both succeed).

- [ ] **Step 4: Manual test**

With an active specialist↔client relationship: specialist messages the client; the client sees the thread + a "New message" notification, and replies. A non-client recipient is rejected with 403.

- [ ] **Step 5: Update the verification doc**

Flip B15 to ✅ (in-app consultation messaging).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/specialist/messages/page.tsx frontend/app/specialist/layout.tsx frontend/app/specialist/clients/[id]/page.tsx docs/feature_verification.md
git commit -m "feat(specialist): messaging page + message-client action; mark B15 done"
```

---

## Self-Review

**Spec coverage:** B15 (Tasks 1–6, full stack). The single feature is fully covered.

**Placeholder scan:** Task 6 Step 2 binds to the client detail page's existing `clientId` var (read-first). All backend code, the migration, and the shared `Messaging` component are complete and exact.

**Type consistency:** `Message`/`MessageThread` types match the router returns (`get_thread` returns ORM rows = `Message`; `list_threads` returns the dict with `partner_id/partner_name/last_body/last_at/unread` = `MessageThread`). `sendMessage(recipientId, body)` posts `{recipient_id, body}` matching `MessageIn`. The `Message` model columns match the `0013_messages.sql` table.

**Dependency note:** Task 1 (migration applied) + Task 2 (model) must land before Task 3, or `/messages` reads raise at query time. The `or_` + bitwise `&` filter style matches SQLAlchemy 2.0 used elsewhere in the repo.
