"""Notification service (Platform Services, SDD §5.1.5 / 3.2.17).

Adds a notification row to the current transaction; the caller commits.
(Realtime/push/email delivery is future work.)
"""

import datetime as dt
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


async def notify(
    db: AsyncSession,
    *,
    recipient_id: uuid.UUID,
    type: str,
    message: str,
) -> None:
    db.add(
        Notification(
            notification_id=uuid.uuid4(),
            recipient_id=recipient_id,
            type=type,
            message=message,
            status="unread",
            sent_at=dt.datetime.now(dt.timezone.utc),
        )
    )
