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
