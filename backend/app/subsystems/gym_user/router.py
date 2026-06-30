"""Gym User subsystem (SDD §5.1.2).

MVP scope — no AI: manual workout-plan builder (UC3), profile management (UC4),
activity & dietary logging (UC5/UC6), progress + dashboard. The AI hooks
(plan generation, calorie suggestions) are deferred per the roadmap and will
live in app/subsystems/ai_integration.
"""

import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.storage import PUBLIC_BUCKET, public_url, safe_object_path, upload_object
from app.core.security import CurrentUser, require_gym_user
from app.services.milestones import check_and_award
from app.services.calories import estimate_calories_burned
from app.services.metrics import weekly_consistency
from app.services.scheduling import suggest_alternative_slot
from app.services.notification import notify
from app.models import (
    ActivityLog,
    CommunityGroup,
    CommunityPost,
    DietaryLog,
    EducationalContent,
    Exercise,
    Feedback,
    FitnessProfile,
    Friendship,
    GroupMember,
    GroupMessage,
    MealPlan,
    Milestone,
    Profile,
    ProgressEntry,
    Report,
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


class PlanUpdate(BaseModel):
    goal: str | None = None
    status: str | None = None  # 'active' | 'superseded'


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


class AIExerciseIn(BaseModel):
    name: str
    sets: int | None = None
    reps: int | None = None
    rest_seconds: int | None = None
    notes: str | None = None


class AIPlanAcceptIn(BaseModel):
    goal: str
    exercises: list[AIExerciseIn] = []


@router.post("/plans/ai-accept", status_code=status.HTTP_201_CREATED)
async def accept_ai_plan(body: AIPlanAcceptIn, user: GymUserDep, db: DbDep):
    """Persist an AI-generated plan the user accepted (A5), with its exercises."""
    plan = WorkoutPlan(
        plan_id=uuid.uuid4(),
        user_id=uuid.UUID(user.id),
        goal=body.goal,
        generated_by="openai",
        status="active",
        created_at=_now(),
    )
    db.add(plan)
    await db.flush()  # ensure the workout_plans row exists before its exercises reference it
    for i, ex in enumerate(body.exercises):
        db.add(Exercise(
            exercise_id=uuid.uuid4(),
            plan_id=plan.plan_id,
            name=ex.name,
            sets=ex.sets,
            reps=ex.reps,
            rest_seconds=ex.rest_seconds,
            order_index=i,
            notes=ex.notes,
            created_at=_now(),
        ))
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/plans/{plan_id}")
async def update_plan(plan_id: uuid.UUID, body: PlanUpdate, user: GymUserDep, db: DbDep):
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None or plan.user_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout plan not found")
    updates = body.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in ("active", "superseded"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    if "goal" in updates and updates["goal"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="goal cannot be null")
    for field, value in updates.items():
        setattr(plan, field, value)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/plans/{plan_id}/exercises")
async def list_plan_exercises(plan_id: uuid.UUID, user: GymUserDep, db: DbDep):
    """Full per-exercise breakdown for one of the caller's plans (UC3 detail view)."""
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None or plan.user_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout plan not found")
    result = await db.execute(
        select(Exercise)
        .where(Exercise.plan_id == plan_id)
        .order_by(Exercise.order_index)
    )
    return result.scalars().all()


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def discard_plan(plan_id: uuid.UUID, user: GymUserDep, db: DbDep):
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None or plan.user_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout plan not found")
    await db.delete(plan)  # workout_sessions cascade via FK ondelete=CASCADE
    await db.commit()


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
VALID_MEAL_TIMES = {"breakfast", "lunch", "dinner", "snack"}


@router.post("/diet", status_code=status.HTTP_201_CREATED)
async def log_diet(body: DietaryLogIn, user: GymUserDep, db: DbDep):
    data = body.model_dump()
    # The DB meal_time enum is lowercase; normalize the client's label (e.g.
    # "Breakfast" -> "breakfast") and reject anything outside the allowed set.
    if data.get("meal_time"):
        meal = str(data["meal_time"]).strip().lower()
        if meal not in VALID_MEAL_TIMES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"meal_time must be one of {sorted(VALID_MEAL_TIMES)}",
            )
        data["meal_time"] = meal
    log = DietaryLog(log_id=uuid.uuid4(), user_id=uuid.UUID(user.id), **data)
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


@router.post("/progress/photo")
async def upload_progress_photo(user: GymUserDep, file: UploadFile = File(...)):
    """Upload a progress photo to the public bucket; returns its URL (A24).

    The returned `photo_url` is then sent with POST /gym/progress.
    """
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 5 MB")
    path = safe_object_path("progress", user.id, file.filename or "photo.jpg")
    await upload_object(PUBLIC_BUCKET, path, content, file.content_type or "image/jpeg")
    return {"photo_url": public_url(PUBLIC_BUCKET, path)}


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

    # UC9 / A31 conflict check: gather all booked times on that date.
    booked_times = (
        await db.execute(
            select(WorkoutSession.scheduled_time)
            .join(WorkoutPlan, WorkoutPlan.plan_id == WorkoutSession.plan_id)
            .where(
                WorkoutPlan.user_id == uuid.UUID(user.id),
                WorkoutSession.scheduled_date == body.scheduled_date,
                WorkoutSession.status == "scheduled",
            )
        )
    ).scalars().all()
    if body.scheduled_time in set(booked_times):
        alt = suggest_alternative_slot(body.scheduled_time, set(booked_times))
        hint = f" Next free slot that day is {alt.strftime('%H:%M')}." if alt else ""
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"That time slot conflicts with an existing scheduled session.{hint}",
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
    # A32: queue a workout reminder for the user (same transaction).
    if body.reminder_set:
        await notify(
            db,
            recipient_id=uuid.UUID(user.id),
            type="workout_reminder",
            title="Workout reminder set",
            body=f"You scheduled a workout on {body.scheduled_date} at {body.scheduled_time.strftime('%H:%M')}.",
            ref_type="workout_session",
            ref_id=session.session_id,
        )
    await db.commit()
    await db.refresh(session)
    return session


# --- Educational content library (UC3 read side) -----------------------------
@router.get("/content")
async def gym_list_content(user: GymUserDep, db: DbDep, category: str | None = None):
    """Published educational content from any specialist, for the gym user library.

    Only 'Published' + visible rows are returned (drafts/archived stay hidden).
    Each item carries its author's display name. Read-only; no notification fan-out.
    """
    stmt = (
        select(EducationalContent, Profile.name)
        .outerjoin(Profile, Profile.id == EducationalContent.specialist_id)
        .where(
            EducationalContent.status == "Published",
            EducationalContent.visibility.is_(True),
        )
        .order_by(EducationalContent.created_at.desc())
    )
    if category:
        stmt = stmt.where(EducationalContent.category == category)
    rows = (await db.execute(stmt)).all()
    return [
        {
            "content_id": c.content_id,
            "title": c.title,
            "body": c.body,
            "category": c.category,
            "media_url": c.media_url,
            "specialist_id": c.specialist_id,
            "specialist_name": name,
            "created_at": c.created_at,
        }
        for c, name in rows
    ]


# --- Social feed (issue #3 P1) ----------------------------------------------
# The global feed reuses community_posts with group_id IS NULL. Posts carry an
# optional image and an author identity for rendering.
class FeedPostIn(BaseModel):
    content: str = ""
    image_url: str | None = None


class ReportIn(BaseModel):
    target_type: str  # 'post' | 'message' | 'user'
    target_id: uuid.UUID
    reason: str | None = None


VALID_REPORT_TARGET = {"post", "message", "user"}


async def _serialize_feed_posts(db: AsyncSession, rows) -> list[dict]:
    return [
        {
            "post_id": p.post_id,
            "author_id": p.author_id,
            "author_name": name,
            "author_role": role,
            "content": p.content,
            "image_url": p.image_url,
            "created_at": p.created_at,
        }
        for p, name, role in rows
    ]


@router.get("/feed")
async def gym_list_feed(user: GymUserDep, db: DbDep, limit: int = 50):
    """Global social feed: posts (any author) not tied to a group, newest first."""
    rows = (
        await db.execute(
            select(CommunityPost, Profile.name, Profile.role)
            .outerjoin(Profile, Profile.id == CommunityPost.author_id)
            .where(CommunityPost.group_id.is_(None), CommunityPost.status != "Removed")
            .order_by(CommunityPost.created_at.desc())
            .limit(limit)
        )
    ).all()
    return await _serialize_feed_posts(db, rows)


@router.post("/feed", status_code=status.HTTP_201_CREATED)
async def gym_create_feed_post(body: FeedPostIn, user: GymUserDep, db: DbDep):
    """Share a progress post to the global feed (text and/or an image)."""
    content = body.content.strip()
    if not content and not body.image_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A post needs text or an image.",
        )
    post = CommunityPost(
        post_id=uuid.uuid4(),
        group_id=None,
        author_id=uuid.UUID(user.id),
        content=content,
        image_url=body.image_url,
        status="Posted",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return {
        "post_id": post.post_id,
        "author_id": post.author_id,
        "author_name": user.name,
        "author_role": "gym_user",
        "content": post.content,
        "image_url": post.image_url,
        "created_at": post.created_at,
    }


@router.post("/feed/photo")
async def upload_feed_photo(user: GymUserDep, file: UploadFile = File(...)):
    """Upload a feed image to the public bucket; returns its URL for POST /gym/feed."""
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 5 MB")
    path = safe_object_path("feed", user.id, file.filename or "photo.jpg")
    await upload_object(PUBLIC_BUCKET, path, content, file.content_type or "image/jpeg")
    return {"image_url": public_url(PUBLIC_BUCKET, path)}


@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def gym_create_report(body: ReportIn, user: GymUserDep, db: DbDep):
    """Report a post, message, or user to the admins for review (issue #3 P1)."""
    if body.target_type not in VALID_REPORT_TARGET:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"target_type must be one of {sorted(VALID_REPORT_TARGET)}",
        )
    # Validate the target exists and flag a reported post so moderators see it.
    if body.target_type == "post":
        post = await db.get(CommunityPost, body.target_id)
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        if post.status == "Posted":
            post.status = "Flagged"
    elif body.target_type == "user":
        if await db.get(Profile, body.target_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    report = Report(
        report_id=uuid.uuid4(),
        reporter_id=uuid.UUID(user.id),
        target_type=body.target_type,
        target_id=body.target_id,
        reason=(body.reason or "").strip() or None,
        status="open",
    )
    db.add(report)
    # Notify every admin that a new report is waiting.
    admins = (await db.execute(select(Profile.id).where(Profile.role == "admin"))).scalars().all()
    for aid in admins:
        await notify(
            db,
            recipient_id=aid,
            type="moderation",
            title="New content report",
            body=f"A {body.target_type} was reported and is awaiting review.",
            ref_type="report",
            ref_id=report.report_id,
        )
    await db.commit()
    await db.refresh(report)
    return {"report_id": report.report_id, "status": report.status}


# --- Friends + member directory (issue #3 P2) -------------------------------
class FriendRequestIn(BaseModel):
    addressee_id: uuid.UUID


async def _friend_states(
    db: AsyncSession, me: uuid.UUID, others: list[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """Map each other-user id to my relationship with them.

    States: 'none' | 'pending_out' (I requested) | 'pending_in' (they requested,
    awaiting my response) | 'friends'. Declined relationships read as 'none' so a
    new request can be sent.
    """
    if not others:
        return {}
    rows = (
        await db.execute(
            select(Friendship).where(
                or_(
                    and_(Friendship.requester_id == me, Friendship.addressee_id.in_(others)),
                    and_(Friendship.addressee_id == me, Friendship.requester_id.in_(others)),
                )
            )
        )
    ).scalars().all()
    state: dict[uuid.UUID, str] = {oid: "none" for oid in others}
    for f in rows:
        other = f.addressee_id if f.requester_id == me else f.requester_id
        if f.status == "accepted":
            state[other] = "friends"
        elif f.status == "pending":
            state[other] = "pending_out" if f.requester_id == me else "pending_in"
        # declined -> leave as 'none'
    return state


def _public_member(profile: Profile, fp: FitnessProfile | None, friend_state: str) -> dict:
    """Non-sensitive public view of a member (never weight/body-fat/logs)."""
    return {
        "user_id": profile.id,
        "name": profile.name,
        "goal": fp.fitness_goal if fp else None,
        "friend_state": friend_state,
        "can_message": friend_state == "friends",
    }


@router.get("/members")
async def gym_list_members(user: GymUserDep, db: DbDep, query: str | None = None):
    """Browsable directory of other active gym users (non-sensitive fields)."""
    me = uuid.UUID(user.id)
    stmt = (
        select(Profile, FitnessProfile)
        .outerjoin(FitnessProfile, FitnessProfile.user_id == Profile.id)
        .where(Profile.role == "gym_user", Profile.status == "active", Profile.id != me)
        .order_by(Profile.name)
    )
    if query and query.strip():
        like = f"%{query.strip().lower()}%"
        stmt = stmt.where(func.lower(Profile.name).like(like))
    rows = (await db.execute(stmt)).all()
    states = await _friend_states(db, me, [p.id for p, _ in rows])
    return [_public_member(p, fp, states.get(p.id, "none")) for p, fp in rows]


@router.get("/members/{user_id}")
async def gym_get_member(user_id: uuid.UUID, user: GymUserDep, db: DbDep):
    """Public profile of a single member (non-sensitive fields only)."""
    me = uuid.UUID(user.id)
    profile = await db.get(Profile, user_id)
    if profile is None or profile.role != "gym_user":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    fp = await db.get(FitnessProfile, user_id)
    state = (await _friend_states(db, me, [user_id])).get(user_id, "none") if user_id != me else "self"
    return _public_member(profile, fp, state)


@router.get("/friends")
async def gym_list_friends(user: GymUserDep, db: DbDep):
    """My accepted friends."""
    me = uuid.UUID(user.id)
    rows = (
        await db.execute(
            select(Friendship).where(
                Friendship.status == "accepted",
                or_(Friendship.requester_id == me, Friendship.addressee_id == me),
            )
        )
    ).scalars().all()
    friend_ids = [f.addressee_id if f.requester_id == me else f.requester_id for f in rows]
    if not friend_ids:
        return []
    profiles = (
        await db.execute(select(Profile).where(Profile.id.in_(friend_ids)).order_by(Profile.name))
    ).scalars().all()
    return [{"user_id": p.id, "name": p.name} for p in profiles]


@router.get("/friends/requests")
async def gym_list_friend_requests(user: GymUserDep, db: DbDep):
    """My pending friend requests, split into incoming and outgoing."""
    me = uuid.UUID(user.id)
    rows = (
        await db.execute(
            select(Friendship)
            .where(
                Friendship.status == "pending",
                or_(Friendship.requester_id == me, Friendship.addressee_id == me),
            )
            .order_by(Friendship.created_at.desc())
        )
    ).scalars().all()
    # Resolve the "other" party's name in one lookup.
    other_ids = {f.requester_id if f.addressee_id == me else f.addressee_id for f in rows}
    names: dict[uuid.UUID, str | None] = {}
    if other_ids:
        for p in (
            await db.execute(select(Profile).where(Profile.id.in_(other_ids)))
        ).scalars().all():
            names[p.id] = p.name
    incoming, outgoing = [], []
    for f in rows:
        other_id = f.requester_id if f.addressee_id == me else f.addressee_id
        item = {
            "friendship_id": f.friendship_id,
            "other_id": other_id,
            "other_name": names.get(other_id),
            "created_at": f.created_at,
        }
        (incoming if f.addressee_id == me else outgoing).append(item)
    return {"incoming": incoming, "outgoing": outgoing}


@router.post("/friends/requests", status_code=status.HTTP_201_CREATED)
async def gym_send_friend_request(body: FriendRequestIn, user: GymUserDep, db: DbDep):
    """Send a friend request to another gym user."""
    me = uuid.UUID(user.id)
    other = body.addressee_id
    if other == me:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="You can't friend yourself")
    target = await db.get(Profile, other)
    if target is None or target.role != "gym_user":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # An existing non-declined relationship (either direction) blocks a new request.
    existing = (
        await db.execute(
            select(Friendship).where(
                or_(
                    and_(Friendship.requester_id == me, Friendship.addressee_id == other),
                    and_(Friendship.requester_id == other, Friendship.addressee_id == me),
                )
            )
        )
    ).scalar_one_or_none()
    if existing is not None and existing.status != "declined":
        detail = "Already friends" if existing.status == "accepted" else "A request is already pending"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
    if existing is not None:
        # Reuse the declined row as a fresh outgoing request.
        existing.requester_id, existing.addressee_id = me, other
        existing.status = "pending"
        existing.created_at = _now()
        existing.responded_at = None
        fr = existing
    else:
        fr = Friendship(
            friendship_id=uuid.uuid4(), requester_id=me, addressee_id=other,
            status="pending", created_at=_now(),
        )
        db.add(fr)
    await notify(
        db, recipient_id=other, type="friend_request",
        title="New friend request",
        body=f"{user.name or 'A member'} sent you a friend request.",
        ref_type="friendship", ref_id=fr.friendship_id,
    )
    await db.commit()
    return {"friendship_id": fr.friendship_id, "status": "pending"}


async def _respond_to_request(
    db: AsyncSession, me: uuid.UUID, friendship_id: uuid.UUID, accept: bool
) -> Friendship:
    fr = await db.get(Friendship, friendship_id)
    # Only the addressee may respond, and only to a pending request.
    if fr is None or fr.addressee_id != me or fr.status != "pending":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    fr.status = "accepted" if accept else "declined"
    fr.responded_at = _now()
    return fr


@router.post("/friends/requests/{friendship_id}/accept")
async def gym_accept_friend_request(friendship_id: uuid.UUID, user: GymUserDep, db: DbDep):
    me = uuid.UUID(user.id)
    fr = await _respond_to_request(db, me, friendship_id, accept=True)
    await notify(
        db, recipient_id=fr.requester_id, type="friend_request",
        title="Friend request accepted",
        body=f"{user.name or 'A member'} accepted your friend request. You can now message each other.",
    )
    await db.commit()
    return {"friendship_id": friendship_id, "status": "accepted"}


@router.post("/friends/requests/{friendship_id}/decline")
async def gym_decline_friend_request(friendship_id: uuid.UUID, user: GymUserDep, db: DbDep):
    me = uuid.UUID(user.id)
    await _respond_to_request(db, me, friendship_id, accept=False)
    await db.commit()
    return {"friendship_id": friendship_id, "status": "declined"}


@router.delete("/friends/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def gym_remove_friend(user_id: uuid.UUID, user: GymUserDep, db: DbDep):
    """Remove a friend (deletes the relationship in either direction)."""
    me = uuid.UUID(user.id)
    fr = (
        await db.execute(
            select(Friendship).where(
                Friendship.status == "accepted",
                or_(
                    and_(Friendship.requester_id == me, Friendship.addressee_id == user_id),
                    and_(Friendship.requester_id == user_id, Friendship.addressee_id == me),
                ),
            )
        )
    ).scalar_one_or_none()
    if fr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not friends")
    await db.delete(fr)
    await db.commit()


# --- Community groups: browse, join, post, chat (A28 + issue #3 P3) ----------
class CommunityPostIn(BaseModel):
    content: str


class GroupChatIn(BaseModel):
    body: str


async def _require_group(db: AsyncSession, group_id: uuid.UUID) -> CommunityGroup:
    group = await db.get(CommunityGroup, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


async def _require_membership(db: AsyncSession, group_id: uuid.UUID, me: uuid.UUID) -> None:
    """Posting and chatting require having joined the group (issue #3 P3)."""
    if await db.get(GroupMember, (group_id, me)) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join this group to post and chat.",
        )


@router.get("/community/groups")
async def gym_list_groups(user: GymUserDep, db: DbDep):
    """All groups, annotated with member count and whether I've joined."""
    me = uuid.UUID(user.id)
    member_count = (
        select(GroupMember.group_id, func.count().label("n"))
        .group_by(GroupMember.group_id)
        .subquery()
    )
    rows = (
        await db.execute(
            select(CommunityGroup, member_count.c.n, GroupMember.user_id)
            .outerjoin(member_count, member_count.c.group_id == CommunityGroup.group_id)
            .outerjoin(
                GroupMember,
                (GroupMember.group_id == CommunityGroup.group_id) & (GroupMember.user_id == me),
            )
            .order_by(CommunityGroup.name)
        )
    ).all()
    return [
        {
            "group_id": g.group_id,
            "name": g.name,
            "description": g.description,
            "member_count": n or 0,
            "is_member": mid is not None,
        }
        for g, n, mid in rows
    ]


@router.post("/community/groups/{group_id}/join", status_code=status.HTTP_201_CREATED)
async def gym_join_group(group_id: uuid.UUID, user: GymUserDep, db: DbDep):
    await _require_group(db, group_id)
    me = uuid.UUID(user.id)
    if await db.get(GroupMember, (group_id, me)) is None:
        db.add(GroupMember(group_id=group_id, user_id=me, joined_at=_now()))
        await db.commit()
    return {"group_id": group_id, "is_member": True}


@router.delete("/community/groups/{group_id}/join", status_code=status.HTTP_204_NO_CONTENT)
async def gym_leave_group(group_id: uuid.UUID, user: GymUserDep, db: DbDep):
    member = await db.get(GroupMember, (group_id, uuid.UUID(user.id)))
    if member is not None:
        await db.delete(member)
        await db.commit()


@router.get("/community/groups/{group_id}/posts")
async def gym_list_posts(group_id: uuid.UUID, user: GymUserDep, db: DbDep):
    await _require_group(db, group_id)
    rows = (await db.execute(
        select(CommunityPost)
        .where(CommunityPost.group_id == group_id, CommunityPost.status != "Removed")
        .order_by(CommunityPost.created_at.desc())
    )).scalars().all()
    return rows


@router.post("/community/groups/{group_id}/posts", status_code=status.HTTP_201_CREATED)
async def gym_create_post(group_id: uuid.UUID, body: CommunityPostIn, user: GymUserDep, db: DbDep):
    """Post to a group — members only (issue #3 P3)."""
    await _require_group(db, group_id)
    me = uuid.UUID(user.id)
    await _require_membership(db, group_id, me)
    if not body.content.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="content is required")
    post = CommunityPost(
        post_id=uuid.uuid4(), group_id=group_id, author_id=me,
        content=body.content.strip(), status="Posted",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


@router.get("/community/groups/{group_id}/chat")
async def gym_list_group_chat(group_id: uuid.UUID, user: GymUserDep, db: DbDep, limit: int = 100):
    """Recent group chat messages (members only). Oldest-first for display."""
    await _require_group(db, group_id)
    me = uuid.UUID(user.id)
    await _require_membership(db, group_id, me)
    rows = (
        await db.execute(
            select(GroupMessage, Profile.name)
            .outerjoin(Profile, Profile.id == GroupMessage.sender_id)
            .where(GroupMessage.group_id == group_id)
            .order_by(GroupMessage.created_at.desc())
            .limit(limit)
        )
    ).all()
    # Return oldest-first so the chat reads top-to-bottom.
    return [
        {
            "message_id": m.message_id,
            "sender_id": m.sender_id,
            "sender_name": name,
            "body": m.body,
            "created_at": m.created_at,
        }
        for m, name in reversed(rows)
    ]


@router.post("/community/groups/{group_id}/chat", status_code=status.HTTP_201_CREATED)
async def gym_send_group_chat(group_id: uuid.UUID, body: GroupChatIn, user: GymUserDep, db: DbDep):
    """Send a group chat message (members only)."""
    await _require_group(db, group_id)
    me = uuid.UUID(user.id)
    await _require_membership(db, group_id, me)
    if not body.body.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="body is required")
    msg = GroupMessage(
        message_id=uuid.uuid4(), group_id=group_id, sender_id=me,
        body=body.body.strip(), created_at=_now(),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return {
        "message_id": msg.message_id,
        "sender_id": msg.sender_id,
        "sender_name": user.name,
        "body": msg.body,
        "created_at": msg.created_at,
    }
