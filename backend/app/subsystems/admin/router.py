"""Admin subsystem (SDD §5.1.4).

View/manage users (UC2/UC3), approve registrations (UC4), suspend/reinstate
(UC5), assign roles (UC1), announcements (UC8). All mutating actions write to
the audit log per the SDD.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, require_admin
from app.models import Profile
from app.services.audit import record_audit

router = APIRouter(prefix="/admin", tags=["admin"])

AdminDep = Annotated[CurrentUser, Depends(require_admin)]
DbDep = Annotated[AsyncSession, Depends(get_db)]

VALID_STATUS = {"pending", "active", "suspended"}


class StatusUpdate(BaseModel):
    status: str


# --- UC3: View All Users ----------------------------------------------------
@router.get("/users")
async def list_users(
    admin: AdminDep,
    db: DbDep,
    role: str | None = None,
    status_filter: str | None = None,
):
    stmt = select(Profile)
    if role:
        stmt = stmt.where(Profile.role == role)
    if status_filter:
        stmt = stmt.where(Profile.status == status_filter)
    result = await db.execute(stmt.order_by(Profile.created_at.desc()))
    return result.scalars().all()


# --- UC2/UC4/UC5: Manage user account status --------------------------------
@router.patch("/users/{user_id}/status")
async def set_user_status(user_id: uuid.UUID, body: StatusUpdate, admin: AdminDep, db: DbDep):
    if body.status not in VALID_STATUS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    profile = await db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile.status = body.status
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="set_user_status",
                       details=f"{user_id} -> {body.status}")
    await db.commit()
    await db.refresh(profile)
    return profile

# TODO (frontend-driven): UC1 assign role, UC6 monitor activity,
# UC7 remove inactive programs, UC8/UC9 announcements & program-update notices.
