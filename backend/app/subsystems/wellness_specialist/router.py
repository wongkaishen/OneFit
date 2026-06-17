"""Wellness Specialist subsystem (SDD §5.1.3).

MVP scope — no AI: progress review, educational content (UC3), professional
feedback (UC4), and the meal-plan canvas the frontend builds. Per the SDD rule,
submitting feedback updates the user's plan and notifies them; in the MVP the
specialist updates the plan manually and AI auto-recalculation is deferred.
"""

import datetime as dt
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, require_specialist
from app.models import (
    ActivityLog,
    DietaryLog,
    EducationalContent,
    Feedback,
    FitnessProfile,
    MealPlan,
    Profile,
    ProgressEntry,
)
from app.services.notification import notify

router = APIRouter(prefix="/specialist", tags=["wellness_specialist"])

SpecialistDep = Annotated[CurrentUser, Depends(require_specialist)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


# --- Schemas ----------------------------------------------------------------
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


class ClientSummary(BaseModel):
    user_id: uuid.UUID
    name: str | None = None
    email: str
    goal: str | None = None
    weight: float | None = None
    body_fat_percent: float | None = None
    last_active_at: dt.datetime | None = None


class MealPlanIn(BaseModel):
    name: str
    goal: str = "maintain"
    days_per_week: int = Field(default=7, ge=1, le=7)
    payload: list[Any] | dict = Field(default_factory=list)
    client_id: uuid.UUID | None = None


class MealPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: uuid.UUID
    specialist_id: uuid.UUID
    client_id: uuid.UUID | None = None
    name: str
    goal: str
    days_per_week: int
    payload: Any
    created_at: dt.datetime


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


# --- UC1: Review client roster + progress -----------------------------------
async def _client_row(db: AsyncSession, profile: Profile) -> ClientSummary:
    """Compose a ClientSummary by joining profile + fitness_profile + last activity."""
    fp = await db.get(FitnessProfile, profile.id)
    last_activity = (
        await db.execute(
            select(func.max(ActivityLog.log_date)).where(ActivityLog.user_id == profile.id)
        )
    ).scalar()
    last_diet = (
        await db.execute(
            select(func.max(DietaryLog.log_date)).where(DietaryLog.user_id == profile.id)
        )
    ).scalar()
    last_progress = (
        await db.execute(
            select(func.max(ProgressEntry.recorded_at)).where(ProgressEntry.user_id == profile.id)
        )
    ).scalar()
    candidates: list[dt.datetime] = []
    for d in (last_activity, last_diet):
        if d is not None:
            candidates.append(dt.datetime.combine(d, dt.time.min, tzinfo=dt.timezone.utc))
    if last_progress is not None:
        candidates.append(last_progress)
    last_active = max(candidates) if candidates else None
    return ClientSummary(
        user_id=profile.id,
        name=profile.name,
        email=profile.email,
        goal=fp.fitness_goal if fp else None,
        weight=float(fp.weight) if fp and fp.weight is not None else None,
        body_fat_percent=float(fp.body_fat_percent) if fp and fp.body_fat_percent is not None else None,
        last_active_at=last_active,
    )


@router.get("/clients", response_model=list[ClientSummary])
async def list_clients(user: SpecialistDep, db: DbDep):
    """MVP: specialist sees every gym user (no explicit assignment table yet)."""
    result = await db.execute(
        select(Profile).where(Profile.role == "gym_user").order_by(Profile.name)
    )
    profiles = result.scalars().all()
    return [await _client_row(db, p) for p in profiles]


@router.get("/clients/{user_id}", response_model=ClientSummary)
async def get_client(user_id: uuid.UUID, user: SpecialistDep, db: DbDep):
    profile = await db.get(Profile, user_id)
    if profile is None or profile.role != "gym_user":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return await _client_row(db, profile)


@router.get("/clients/{user_id}/activity")
async def client_activity(user_id: uuid.UUID, user: SpecialistDep, db: DbDep, limit: int = 20):
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.log_date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/clients/{user_id}/diet")
async def client_diet(user_id: uuid.UUID, user: SpecialistDep, db: DbDep, limit: int = 20):
    result = await db.execute(
        select(DietaryLog)
        .where(DietaryLog.user_id == user_id)
        .order_by(DietaryLog.log_date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/clients/{user_id}/progress")
async def client_progress(user_id: uuid.UUID, user: SpecialistDep, db: DbDep, limit: int = 20):
    result = await db.execute(
        select(ProgressEntry)
        .where(ProgressEntry.user_id == user_id)
        .order_by(ProgressEntry.recorded_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


# --- Meal plans (specialist-authored) ---------------------------------------
@router.get("/meal-plans", response_model=list[MealPlanOut])
async def list_meal_plans(user: SpecialistDep, db: DbDep):
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.specialist_id == uuid.UUID(user.id))
        .order_by(MealPlan.created_at.desc())
    )
    return result.scalars().all()


@router.post("/meal-plans", status_code=status.HTTP_201_CREATED, response_model=MealPlanOut)
async def create_meal_plan(body: MealPlanIn, user: SpecialistDep, db: DbDep):
    plan = MealPlan(
        plan_id=uuid.uuid4(),
        specialist_id=uuid.UUID(user.id),
        client_id=body.client_id,
        name=body.name,
        goal=body.goal,
        days_per_week=body.days_per_week,
        payload=body.payload,
        created_at=_now(),
    )
    db.add(plan)
    if body.client_id is not None:
        await notify(
            db,
            recipient_id=body.client_id,
            type="meal_plan",
            message=f"Your specialist published a new meal plan: {body.name}",
        )
    await db.commit()
    await db.refresh(plan)
    return plan
