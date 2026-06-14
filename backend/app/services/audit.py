"""Audit logging (Platform Services, SDD §5.1.5 / 3.2.20).

Adds an audit row to the current transaction; the caller commits. Use for all
admin and other sensitive mutations.
"""

import datetime as dt
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def record_audit(
    db: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    details: str | None = None,
) -> None:
    db.add(
        AuditLog(
            log_id=uuid.uuid4(),
            actor_id=actor_id,
            action=action,
            details=details,
            created_at=dt.datetime.now(dt.timezone.utc),
        )
    )
