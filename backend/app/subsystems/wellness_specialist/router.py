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
    CommunityGroup,
    CommunityPost,
    DietaryLog,
    EducationalContent,
    Feedback,
    FitnessProfile,
    GymUser,
    HealthTrendReport,
    MealPlan,
    Milestone,
    Profile,
    ProgressEntry,
    WellnessTask,
    WorkoutPlan,
    WorkoutSession,
)
from app.services.audit import record_audit
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


class ContentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    category: str | None = None
    media_url: str | None = None
    status: str | None = None  # Draft | Published | Archived


class FeedbackIn(BaseModel):
    user_id: uuid.UUID
    notes: str
    plan_updated: bool = False


class AnnounceIn(BaseModel):
    title: str
    body: str
    audience: str = "gym_users"  # "gym_users" | "all"


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
    # UC3 activity diagram: the copyright/permission declaration must be confirmed
    # before the content can be saved.
    if not body.permission_confirmed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Copyright/permission declaration must be confirmed before saving content.",
        )
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


VALID_CONTENT_STATUS = {"Draft", "Published", "Archived"}


@router.patch("/content/{content_id}")
async def update_content(content_id: uuid.UUID, body: ContentUpdate, user: SpecialistDep, db: DbDep):
    """Edit a draft or change its status (publish / archive). Owner only."""
    content = await db.get(EducationalContent, content_id)
    if content is None or content.specialist_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    if body.status is not None and body.status not in VALID_CONTENT_STATUS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"status must be one of {sorted(VALID_CONTENT_STATUS)}",
        )
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(content, field, value)
    # Keep visibility consistent: archived content is hidden, otherwise visible.
    if body.status == "Archived":
        content.visibility = False
    elif body.status in ("Published", "Draft"):
        content.visibility = True
    await db.commit()
    await db.refresh(content)
    return content


# --- UC4: Provide Professional Feedback -------------------------------------
@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(body: FeedbackIn, user: SpecialistDep, db: DbDep):
    # Feedback may only be directed at a current gym user (see create_meal_plan:
    # a former gym user keeps a stale gym_users row, so check profiles.role).
    client = await db.get(Profile, body.user_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if client.role != "gym_user":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Feedback can only be sent to gym users.",
        )
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


# --- Broadcast an announcement to members -----------------------------------
@router.post("/announcements", status_code=status.HTTP_201_CREATED)
async def announce(body: AnnounceIn, user: SpecialistDep, db: DbDep):
    """Specialist broadcast. The announcements table FK-references admins, so a
    specialist announcement is delivered purely via the notification fan-out
    (reaching each recipient's bell + notifications page)."""
    if body.audience not in {"gym_users", "all"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="audience must be 'gym_users' or 'all'",
        )
    stmt = select(Profile.id)
    if body.audience == "gym_users":
        stmt = stmt.where(Profile.role == "gym_user")
    recipients = (await db.execute(stmt)).scalars().all()
    message = f"{body.title}\n\n{body.body}" if body.body.strip() else body.title
    for rid in recipients:
        await notify(db, recipient_id=rid, type="announcement", message=message)
    await db.commit()
    return {"sent": len(recipients), "audience": body.audience}


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
    # A plan may target a specific client or be a reusable template (client_id None).
    # If targeted, the recipient must currently be a gym user — a former gym user
    # who was promoted to admin/specialist keeps a stale gym_users row, so we check
    # the authoritative profiles.role rather than relying on the FK alone.
    if body.client_id is not None:
        client = await db.get(Profile, body.client_id)
        if client is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        if client.role != "gym_user":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Meal plans can only be assigned to gym users.",
            )
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


# --- UC2: Assign Customized Wellness Tasks ----------------------------------
class WellnessTaskIn(BaseModel):
    target_id: uuid.UUID
    type: str
    description: str
    target_metric: str | None = None
    due_date: dt.date


class WellnessTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: uuid.UUID
    specialist_id: uuid.UUID
    target_id: uuid.UUID
    type: str
    description: str
    target_metric: str | None = None
    due_date: dt.date
    status: str


@router.get("/tasks", response_model=list[WellnessTaskOut])
async def list_tasks(user: SpecialistDep, db: DbDep):
    result = await db.execute(
        select(WellnessTask)
        .where(WellnessTask.specialist_id == uuid.UUID(user.id))
        .order_by(WellnessTask.due_date)
    )
    return result.scalars().all()


@router.post("/tasks", status_code=status.HTTP_201_CREATED, response_model=WellnessTaskOut)
async def assign_task(body: WellnessTaskIn, user: SpecialistDep, db: DbDep):
    """Assign a wellness task to a gym user (UC2): validate, store as Assigned,
    notify the target. Input validation that the diagram loops on is enforced here."""
    if not body.type.strip() or not body.description.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="type and description are required",
        )
    if body.due_date < dt.date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="due_date cannot be in the past",
        )
    target = await db.get(Profile, body.target_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    task = WellnessTask(
        task_id=uuid.uuid4(),
        specialist_id=uuid.UUID(user.id),
        target_id=body.target_id,
        type=body.type,
        description=body.description,
        target_metric=body.target_metric,
        due_date=body.due_date,
        status="Assigned",
    )
    db.add(task)
    await notify(
        db,
        recipient_id=body.target_id,
        type="task",
        message=f"New wellness task assigned: {body.type} (due {body.due_date.isoformat()})",
    )
    await db.commit()
    await db.refresh(task)
    return task


# --- UC5: Monitor Gym User Wellness Community Groups -------------------------
class ModerateIn(BaseModel):
    # "remove" | "warn" | "escalate"
    action: str
    severity: str | None = None  # low | medium | high (used for escalate)


@router.get("/community/groups")
async def list_community_groups(user: SpecialistDep, db: DbDep):
    result = await db.execute(
        select(CommunityGroup)
        .where(CommunityGroup.specialist_id == uuid.UUID(user.id))
        .order_by(CommunityGroup.name)
    )
    return [
        {"group_id": g.group_id, "name": g.name, "description": g.description}
        for g in result.scalars().all()
    ]


@router.get("/community/groups/{group_id}/posts")
async def list_group_posts(group_id: uuid.UUID, user: SpecialistDep, db: DbDep):
    """Recent posts + flagged items for a group the specialist owns (UC5)."""
    group = await db.get(CommunityGroup, group_id)
    if group is None or group.specialist_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    result = await db.execute(
        select(CommunityPost)
        .where(CommunityPost.group_id == group_id)
        .order_by(CommunityPost.created_at.desc())
    )
    return result.scalars().all()


@router.post("/community/posts/{post_id}/moderate")
async def moderate_post(post_id: uuid.UUID, body: ModerateIn, user: SpecialistDep, db: DbDep):
    """Take a moderation action on a post (UC5).

    high-severity escalates to Admin; otherwise the post is removed or the
    author warned. The action is logged and the author notified.
    """
    post = await db.get(CommunityPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    # The post must belong to a group this specialist owns.
    group = await db.get(CommunityGroup, post.group_id)
    if group is None or group.specialist_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your group")

    action = body.action
    if action == "escalate" or body.severity == "high":
        post.status = "Escalated"
        post.severity = body.severity or "high"
        # Escalate to every admin.
        admins = (await db.execute(select(Profile.id).where(Profile.role == "admin"))).scalars().all()
        for aid in admins:
            await notify(
                db,
                recipient_id=aid,
                type="moderation",
                message=f"Post {post_id} escalated for review (severity {post.severity}).",
            )
        author_msg = "A post of yours has been escalated for admin review."
    elif action == "remove":
        post.status = "Removed"
        post.severity = body.severity
        author_msg = "A post of yours was removed for violating community guidelines."
    elif action == "warn":
        post.status = "Flagged"
        post.severity = body.severity or "low"
        author_msg = "A post of yours was flagged. Please review the community guidelines."
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action must be 'remove', 'warn', or 'escalate'",
        )

    await notify(db, recipient_id=post.author_id, type="moderation", message=author_msg)
    await record_audit(
        db,
        actor_id=uuid.UUID(user.id),
        action=f"moderate_post_{action}",
        details=f"post {post_id} -> {post.status}",
    )
    await db.commit()
    await db.refresh(post)
    return post


# --- UC6: Review Health Trends to Improve Program ---------------------------
class TrendIn(BaseModel):
    cohort: str = "all_gym_users"
    period: str = "all_time"


@router.get("/health-trends")
async def list_health_trends(user: SpecialistDep, db: DbDep):
    result = await db.execute(
        select(HealthTrendReport)
        .where(HealthTrendReport.specialist_id == uuid.UUID(user.id))
        .order_by(HealthTrendReport.created_at.desc())
    )
    return result.scalars().all()


@router.post("/health-trends", status_code=status.HTTP_201_CREATED)
async def create_health_trend(body: TrendIn, user: SpecialistDep, db: DbDep):
    """Aggregate anonymized cohort metrics and persist a trend report (UC6).

    Metrics over all gym users (cohort filtering by name only, for the MVP):
      - adherence:            completed / total scheduled sessions  (%)
      - avg_calories:         mean daily dietary calories
      - activity_consistency: gym users with >=1 activity log / total gym users (%)
      - milestone_rate:       gym users with >=1 milestone / total gym users (%)
    No per-user identifiers are stored or returned — only aggregates.
    """
    total_gym = (await db.execute(select(func.count(GymUser.user_id)))).scalar_one()

    sessions = (
        await db.execute(
            select(WorkoutSession.status, func.count())
            .where(WorkoutSession.status.in_(["completed", "missed", "scheduled"]))
            .group_by(WorkoutSession.status)
        )
    ).all()
    counts = {s: c for s, c in sessions}
    total_sessions = sum(counts.values())
    adherence = round(100.0 * counts.get("completed", 0) / total_sessions, 2) if total_sessions else None

    avg_cal = (await db.execute(select(func.avg(DietaryLog.calories)))).scalar()
    avg_calories = round(float(avg_cal), 2) if avg_cal is not None else None

    users_with_activity = (
        await db.execute(select(func.count(func.distinct(ActivityLog.user_id))))
    ).scalar_one()
    users_with_milestone = (
        await db.execute(select(func.count(func.distinct(Milestone.user_id))))
    ).scalar_one()
    activity_consistency = round(100.0 * users_with_activity / total_gym, 2) if total_gym else None
    milestone_rate = round(100.0 * users_with_milestone / total_gym, 2) if total_gym else None

    report = HealthTrendReport(
        report_id=uuid.uuid4(),
        specialist_id=uuid.UUID(user.id),
        cohort=body.cohort,
        period=body.period,
        adherence=adherence,
        avg_calories=avg_calories,
        activity_consistency=activity_consistency,
        milestone_rate=milestone_rate,
        created_at=_now(),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report
