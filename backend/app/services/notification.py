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
    title: str,
    body: str | None = None,
    ref_type: str | None = None,
    ref_id: uuid.UUID | None = None,
) -> None:
    """Queue a notification on the current transaction.

    `title` is the one-line headline shown in lists; `body` is the full content
    revealed on open; `ref_type`/`ref_id` link to the source entity so the UI can
    deep-link. `message` is derived ("title\\n\\nbody") and kept populated so older
    clients that only read `message` still work.
    """
    message = f"{title}\n\n{body}" if body and body.strip() else title
    db.add(
        Notification(
            notification_id=uuid.uuid4(),
            recipient_id=recipient_id,
            type=type,
            message=message,
            title=title,
            body=body,
            ref_type=ref_type,
            ref_id=ref_id,
            status="unread",
            sent_at=dt.datetime.now(dt.timezone.utc),
        )
    )
