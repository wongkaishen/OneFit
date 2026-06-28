"""Gym User subsystem (SDD §5.1.2).

MVP scope — no AI: manual workout-plan builder (UC3), profile management (UC4),
activity & dietary logging (UC5/UC6), progress + dashboard. The AI hooks
(plan generation, calorie suggestions) are deferred per the roadmap and will
live in app/subsystems/ai_integration.
"""

import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, require_gym_user
from app.services.milestones import check_and_award
from app.services.calories import estimate_calories_burned
from app.services.metrics import weekly_consistency
from app.models import (
    ActivityLog,
    DietaryLog,
    Feedback,
    FitnessProfile,
    MealPlan,
    Milestone,
    Profile,
    ProgressEntry,
    WorkoutPlan,
    WorkoutSession,
)

router = APIRouter(prefix="/gym", tags=["gym_user"])

GymUserDep = Annotated[CurrentUser, Depends(require_gym_user)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


# --- Schemas ----------------------------------------------------------------
class FitnessProfileIn(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    height: float | None = Field(default=None, gt=0)          # cm
    weight: float | None = Field(default=None, gt=0)          # kg
    body_fat_percent: float | None = Field(default=None, ge=0, le=100)
    fitness_goal: str | None = None


class WorkoutPlanIn(BaseModel):
    goal: str


class ActivityLogIn(BaseModel):
    workout_type: str | None = None
    duration: int | None = Field(default=None, ge=0)          # minutes
    steps: int | None = Field(default=None, ge=0)
    heart_rate: int | None = Field(default=None, ge=0)
    calories_burned: float | None = Field(default=None, ge=0)
    source: str = "manual"
    log_date: dt.date


class DietaryLogIn(BaseModel):
    meal_time: str | None = None
    food_item: str | None = None
    calories: float = Field(ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)
    entry_mode: str = "quick"
    log_date: dt.date


class ProgressEntryIn(BaseModel):
    weight: float | None = Field(default=None, gt=0)
    body_fat_percent: float | None = Field(default=None, ge=0, le=100)
    height: float | None = Field(default=None, gt=0)
    photo_url: str | None = None


class SessionIn(BaseModel):
    plan_id: uuid.UUID
    scheduled_date: dt.date
    scheduled_time: dt.time
    reminder_set: bool = True


class FeedbackOut(BaseModel):
    feedback_id: uuid.UUID
    specialist_id: uuid.UUID
    specialist_name: str | None = None
    notes: str
    plan_updated: bool
    submitted_at: dt.datetime


# --- UC4: Manage Profile ----------------------------------------------------
@router.get("/profile")
async def get_profile(user: GymUserDep, db: DbDep):
    profile = await db.get(FitnessProfile, uuid.UUID(user.id))
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fitness profile not found")
    return profile


@router.put("/profile")
async def update_profile(body: FitnessProfileIn, user: GymUserDep, db: DbDep):
    profile = await db.get(FitnessProfile, uuid.UUID(user.id))
    if profile is None:
        profile = FitnessProfile(user_id=uuid.UUID(user.id))
        db.add(profile)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


# --- UC3: Create Workout Plan (manual) --------------------------------------
@router.get("/plans")
async def list_plans(user: GymUserDep, db: DbDep):
    result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == uuid.UUID(user.id))
        .order_by(WorkoutPlan.created_at.desc())
    )
    return result.scalars().all()


@router.post("/plans", status_code=status.HTTP_201_CREATED)
async def create_plan(body: WorkoutPlanIn, user: GymUserDep, db: DbDep):
    plan = WorkoutPlan(
        plan_id=uuid.uuid4(),
        user_id=uuid.UUID(user.id),
        goal=body.goal,
        generated_by="manual",      # 'groq' once the AI subsystem lands
        status="active",
        created_at=_now(),
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


# --- UC5: Log Daily Activity ------------------------------------------------
@router.post("/activity", status_code=status.HTTP_201_CREATED)
async def log_activity(body: ActivityLogIn, user: GymUserDep, db: DbDep):
    data = body.model_dump()
    # A13: if the user didn't enter calories burned, estimate from type + duration.
    if data.get("calories_burned") is None:
        profile = await db.get(FitnessProfile, uuid.UUID(user.id))
        data["calories_burned"] = estimate_calories_burned(
            data.get("workout_type"),
            data.get("duration"),
            float(profile.weight) if profile and profile.weight else None,
        )
    log = ActivityLog(
        log_id=uuid.uuid4(),
        user_id=uuid.UUID(user.id),
        status="completed",
        **data,
    )
    db.add(log)
    # Award any milestones this log just unlocked (same transaction).
    await check_and_award(db, uuid.UUID(user.id))
    await db.commit()
    await db.refresh(log)
    return log


# --- UC6: Log Dietary Intake ------------------------------------------------
@router.post("/diet", status_code=status.HTTP_201_CREATED)
async def log_diet(body: DietaryLogIn, user: GymUserDep, db: DbDep):
    log = DietaryLog(log_id=uuid.uuid4(), user_id=uuid.UUID(user.id), **body.model_dump())
    db.add(log)
    await check_and_award(db, uuid.UUID(user.id))
    await db.commit()
    await db.refresh(log)
    return log


# --- Dashboard: today's calorie balance ------------------------------------
@router.get("/dashboard")
async def dashboard(user: GymUserDep, db: DbDep, day: dt.date | None = None):
    day = day or dt.date.today()
    uid = uuid.UUID(user.id)

    consumed = (
        await db.execute(
            select(DietaryLog).where(DietaryLog.user_id == uid, DietaryLog.log_date == day)
        )
    ).scalars().all()
    burned = (
        await db.execute(
            select(ActivityLog).where(ActivityLog.user_id == uid, ActivityLog.log_date == day)
        )
    ).scalars().all()

    # A14: trailing-week consistency over distinct active dates (activity OR diet).
    since = day - dt.timedelta(days=6)
    act_dates = (
        await db.execute(
            select(ActivityLog.log_date).where(
                ActivityLog.user_id == uid, ActivityLog.log_date >= since
            )
        )
    ).scalars().all()
    diet_dates = (
        await db.execute(
            select(DietaryLog.log_date).where(
                DietaryLog.user_id == uid, DietaryLog.log_date >= since
            )
        )
    ).scalars().all()
    consistency = weekly_consistency(set(act_dates) | set(diet_dates), day)

    return {
        "date": day,
        "calories_consumed": float(sum(d.calories or 0 for d in consumed)),
        "calories_burned": float(sum(a.calories_burned or 0 for a in burned)),
        "diet_entries": len(consumed),
        "activity_entries": len(burned),
        **consistency,
    }


# --- UC7: Update Progress ---------------------------------------------------
@router.get("/progress")
async def list_progress(user: GymUserDep, db: DbDep):
    result = await db.execute(
        select(ProgressEntry)
        .where(ProgressEntry.user_id == uuid.UUID(user.id))
        .order_by(ProgressEntry.recorded_at.desc())
    )
    return result.scalars().all()


@router.post("/progress", status_code=status.HTTP_201_CREATED)
async def add_progress(body: ProgressEntryIn, user: GymUserDep, db: DbDep):
    entry = ProgressEntry(
        progress_id=uuid.uuid4(),
        user_id=uuid.UUID(user.id),
        recorded_at=_now(),
        **body.model_dump(),
    )
    db.add(entry)
    await check_and_award(db, uuid.UUID(user.id))
    await db.commit()
    await db.refresh(entry)
    # AI-driven plan-recalculation prompt on a significant change is deferred.
    return entry


# --- Meal plans assigned by a wellness specialist ---------------------------
@router.get("/meal-plans")
async def list_meal_plans(user: GymUserDep, db: DbDep):
    """Meal plans a specialist has published to this gym user (client_id == me)."""
    result = await db.execute(
        select(MealPlan)
        .where(MealPlan.client_id == uuid.UUID(user.id))
        .order_by(MealPlan.created_at.desc())
    )
    return result.scalars().all()


# --- Feedback received from a wellness specialist ---------------------------
@router.get("/feedback", response_model=list[FeedbackOut])
async def list_feedback(user: GymUserDep, db: DbDep):
    """Professional feedback addressed to this gym user (UC4), newest first.

    The specialist's display name is joined from profiles so the gym user sees
    who the feedback is from, not just the raw notes that also arrive by notification.
    """
    rows = (
        await db.execute(
            select(Feedback, Profile.name)
            .join(Profile, Profile.id == Feedback.specialist_id)
            .where(Feedback.user_id == uuid.UUID(user.id))
            .order_by(Feedback.submitted_at.desc())
        )
    ).all()
    return [
        FeedbackOut(
            feedback_id=fb.feedback_id,
            specialist_id=fb.specialist_id,
            specialist_name=name,
            notes=fb.notes,
            plan_updated=fb.plan_updated,
            submitted_at=fb.submitted_at,
        )
        for fb, name in rows
    ]


@router.get("/milestones")
async def list_milestones(user: GymUserDep, db: DbDep):
    result = await db.execute(
        select(Milestone)
        .where(Milestone.user_id == uuid.UUID(user.id))
        .order_by(Milestone.achieved_at.desc())
    )
    return result.scalars().all()


# --- UC9: Schedule Workout --------------------------------------------------
@router.get("/sessions")
async def list_sessions(user: GymUserDep, db: DbDep):
    # Sessions belong to the user via their plans.
    result = await db.execute(
        select(WorkoutSession)
        .join(WorkoutPlan, WorkoutPlan.plan_id == WorkoutSession.plan_id)
        .where(WorkoutPlan.user_id == uuid.UUID(user.id))
        .order_by(WorkoutSession.scheduled_date, WorkoutSession.scheduled_time)
    )
    return result.scalars().all()


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def schedule_session(body: SessionIn, user: GymUserDep, db: DbDep):
    # The plan must belong to the caller.
    plan = await db.get(WorkoutPlan, body.plan_id)
    if plan is None or plan.user_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout plan not found")

    # UC9 conflict check: reject a slot already booked across the user's plans.
    clash = (
        await db.execute(
            select(WorkoutSession.session_id)
            .join(WorkoutPlan, WorkoutPlan.plan_id == WorkoutSession.plan_id)
            .where(
                WorkoutPlan.user_id == uuid.UUID(user.id),
                WorkoutSession.scheduled_date == body.scheduled_date,
                WorkoutSession.scheduled_time == body.scheduled_time,
                WorkoutSession.status == "scheduled",
            )
        )
    ).first()
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That time slot conflicts with an existing scheduled session",
        )

    session = WorkoutSession(
        session_id=uuid.uuid4(),
        plan_id=body.plan_id,
        scheduled_date=body.scheduled_date,
        scheduled_time=body.scheduled_time,
        reminder_set=body.reminder_set,
        status="scheduled",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session
