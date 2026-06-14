"""Notifications (Platform Services, SDD §5.1.5 / Gym User UC10).

Available to any authenticated user — the recipient lists and acknowledges their
own notifications. Creation happens server-side via app.services.notification.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])

UserDep = Annotated[CurrentUser, Depends(get_current_user)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("")
async def list_notifications(user: UserDep, db: DbDep, unread_only: bool = False):
    stmt = select(Notification).where(Notification.recipient_id == uuid.UUID(user.id))
    if unread_only:
        stmt = stmt.where(Notification.status == "unread")
    result = await db.execute(stmt.order_by(Notification.sent_at.desc()))
    return result.scalars().all()


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: uuid.UUID, user: UserDep, db: DbDep):
    note = await db.get(Notification, notification_id)
    if note is None or note.recipient_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    note.status = "read"
    await db.commit()
    await db.refresh(note)
    return note
