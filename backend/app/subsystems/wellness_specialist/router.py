"""Wellness Specialist subsystem (SDD §5.1.3).

MVP scope — no AI: progress review, wellness tasks (UC2), educational content
(UC3), and professional feedback (UC4). Per the SDD rule, submitting feedback
updates the user's plan and notifies them; in the MVP the specialist updates the
plan manually and the AI auto-recalculation is deferred to the AI subsystem.
"""

import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, require_specialist
from app.models import EducationalContent, Feedback
from app.services.notification import notify

router = APIRouter(prefix="/specialist", tags=["wellness_specialist"])

SpecialistDep = Annotated[CurrentUser, Depends(require_specialist)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class ContentIn(BaseModel):
    title: str
    body: str
    category: str
    media_url: str | None = None
    permission_confirmed: bool = False


class FeedbackIn(BaseModel):
    user_id: uuid.UUID
    notes: str
    plan_updated: bool = False


# --- UC3: Manage Educational Content ----------------------------------------
@router.get("/content")
async def list_content(user: SpecialistDep, db: DbDep):
    result = await db.execute(
        select(EducationalContent).where(EducationalContent.specialist_id == uuid.UUID(user.id))
    )
    return result.scalars().all()


@router.post("/content", status_code=status.HTTP_201_CREATED)
async def create_content(body: ContentIn, user: SpecialistDep, db: DbDep):
    content = EducationalContent(
        content_id=uuid.uuid4(),
        specialist_id=uuid.UUID(user.id),
        status="Draft",
        visibility=True,
        created_at=_now(),
        **body.model_dump(),
    )
    db.add(content)
    await db.commit()
    await db.refresh(content)
    return content


# --- UC4: Provide Professional Feedback -------------------------------------
@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(body: FeedbackIn, user: SpecialistDep, db: DbDep):
    fb = Feedback(
        feedback_id=uuid.uuid4(),
        specialist_id=uuid.UUID(user.id),
        user_id=body.user_id,
        notes=body.notes,
        plan_updated=body.plan_updated,
        submitted_at=_now(),
    )
    db.add(fb)
    # SDD rule: submitting feedback notifies the gym user. (AI plan recalculation
    # is deferred; in the MVP the specialist edits the plan manually.)
    await notify(db, recipient_id=body.user_id, type="feedback", message="You have new feedback from your wellness specialist.")
    await db.commit()
    await db.refresh(fb)
    return fb

# TODO (frontend-driven): UC1 review progress reports, UC2 assign wellness tasks,
# UC5 community moderation, UC6 health-trend analytics.
