"""Wellness Specialist subsystem (SDD §5.1.3).

MVP scope — no AI: progress review, educational content (UC3), professional
feedback (UC4), and the meal-plan canvas the frontend builds. Per the SDD rule,
submitting feedback updates the user's plan and notifies them; in the MVP the
specialist updates the plan manually and AI auto-recalculation is deferred.
"""

import datetime as dt
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
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
    SpecialistClient,
    WellnessSpecialist,
    WellnessTask,
    WorkoutPlan,
    WorkoutSession,
)
from app.services.storage import (
    CREDENTIALS_BUCKET,
    PUBLIC_BUCKET,
    public_url,
    safe_object_path,
    upload_object,
)
from app.services.audit import record_audit
from app.services.notification import notify
from app.services.recommendations import recommend_from_trends

router = APIRouter(prefix="/specialist", tags=["wellness_specialist"])

SpecialistDep = Annotated[CurrentUser, Depends(require_specialist)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


async def _require_active_client(
    db: AsyncSession, specialist_id: uuid.UUID, client_id: uuid.UUID
) -> Profile:
    """Authorize a specialist action against one of their own clients.

    A gym user is only a client via an 'active' public.specialist_clients row.
    Raises 404 (rather than 403) for any non-client so a specialist cannot probe
    which users exist or belong to other specialists.
    """
    rel = await db.get(SpecialistClient, (specialist_id, client_id))
    if rel is None or rel.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    profile = await db.get(Profile, client_id)
    if profile is None or profile.role != "gym_user":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return profile


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


class AddClientIn(BaseModel):
    email: str


class ClientSummary(BaseModel):
    user_id: uuid.UUID
    name: str | None = None
    email: str
    goal: str | None = None
    weight: float | None = None
    body_fat_percent: float | None = None
    last_active_at: dt.datetime | None = None


VALID_MEAL_PLAN_STATUS = {"draft", "published"}


class MealPlanIn(BaseModel):
    name: str
    goal: str = "maintain"
    days_per_week: int = Field(default=7, ge=1, le=7)
    payload: list[Any] | dict = Field(default_factory=list)
    client_id: uuid.UUID | None = None
    status: str = "draft"  # 'draft' | 'published'


class MealPlanUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    days_per_week: int | None = Field(default=None, ge=1, le=7)
    payload: list[Any] | dict | None = None
    client_id: uuid.UUID | None = None
    status: str | None = None  # 'draft' | 'published'


class MealPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: uuid.UUID
    specialist_id: uuid.UUID
    client_id: uuid.UUID | None = None
    name: str
    goal: str
    days_per_week: int
    payload: Any
    status: str
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


@router.post("/content/media")
async def upload_content_media(user: SpecialistDep, db: DbDep, file: UploadFile = File(...)):
    """Upload educational media to the public bucket; returns its URL (B11)."""
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 15 MB")
    path = safe_object_path("content", user.id, file.filename or "media.bin")
    await upload_object(PUBLIC_BUCKET, path, content, file.content_type or "application/octet-stream")
    return {"media_url": public_url(PUBLIC_BUCKET, path)}


@router.post("/credentials")
async def upload_credential(user: SpecialistDep, db: DbDep, file: UploadFile = File(...)):
    """Upload a certification doc to the private bucket; store its path (B2)."""
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 15 MB")
    path = safe_object_path("cred", user.id, file.filename or "cert.pdf")
    await upload_object(CREDENTIALS_BUCKET, path, content, file.content_type or "application/pdf")
    spec = await db.get(WellnessSpecialist, uuid.UUID(user.id))
    if spec is not None:
        spec.certification_doc = path  # store the object path, not a public URL
        await db.commit()
    return {"stored": True}


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


@router.delete("/content/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(content_id: uuid.UUID, user: SpecialistDep, db: DbDep):
    """Permanently remove a piece of educational content (B13). Owner only."""
    content = await db.get(EducationalContent, content_id)
    if content is None or content.specialist_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    await db.delete(content)
    await db.commit()


# --- UC4: Provide Professional Feedback -------------------------------------
@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(body: FeedbackIn, user: SpecialistDep, db: DbDep):
    # Feedback may only be directed at one of the specialist's own clients.
    await _require_active_client(db, uuid.UUID(user.id), body.user_id)
    fb = Feedback(
        feedback_id=uuid.uuid4(),
        specialist_id=uuid.UUID(user.id),
        user_id=body.user_id,
        notes=body.notes,
        plan_updated=body.plan_updated,
        submitted_at=_now(),
    )
    db.add(fb)
    # SDD rule: submitting feedback notifies the gym user. The full notes ride in
    # the notification body so the gym user can read the feedback inline. (AI plan
    # recalculation is deferred; in the MVP the specialist edits the plan manually.)
    await notify(
        db,
        recipient_id=body.user_id,
        type="feedback",
        title="New feedback from your specialist",
        body=body.notes,
        ref_type="feedback",
        ref_id=fb.feedback_id,
    )
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
    for rid in recipients:
        await notify(db, recipient_id=rid, type="announcement", title=body.title, body=body.body)
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
    """The specialist's roster: gym users they have an 'active' relationship with.

    A new specialist starts empty. Built as a single query — profile +
    fitness_profile joined, with last-activity timestamps as correlated
    subqueries — to avoid the previous 4-queries-per-client N+1.
    """
    me = uuid.UUID(user.id)
    last_activity = (
        select(func.max(ActivityLog.log_date))
        .where(ActivityLog.user_id == Profile.id)
        .correlate(Profile)
        .scalar_subquery()
    )
    last_diet = (
        select(func.max(DietaryLog.log_date))
        .where(DietaryLog.user_id == Profile.id)
        .correlate(Profile)
        .scalar_subquery()
    )
    last_progress = (
        select(func.max(ProgressEntry.recorded_at))
        .where(ProgressEntry.user_id == Profile.id)
        .correlate(Profile)
        .scalar_subquery()
    )
    rows = (
        await db.execute(
            select(Profile, FitnessProfile, last_activity, last_diet, last_progress)
            .join(SpecialistClient, SpecialistClient.client_id == Profile.id)
            .outerjoin(FitnessProfile, FitnessProfile.user_id == Profile.id)
            .where(SpecialistClient.specialist_id == me, SpecialistClient.status == "active")
            .order_by(Profile.name)
        )
    ).all()

    summaries: list[ClientSummary] = []
    for profile, fp, la, ld, lp in rows:
        candidates: list[dt.datetime] = []
        for d in (la, ld):
            if d is not None:
                candidates.append(dt.datetime.combine(d, dt.time.min, tzinfo=dt.timezone.utc))
        if lp is not None:
            candidates.append(lp)
        summaries.append(
            ClientSummary(
                user_id=profile.id,
                name=profile.name,
                email=profile.email,
                goal=fp.fitness_goal if fp else None,
                weight=float(fp.weight) if fp and fp.weight is not None else None,
                body_fat_percent=(
                    float(fp.body_fat_percent) if fp and fp.body_fat_percent is not None else None
                ),
                last_active_at=max(candidates) if candidates else None,
            )
        )
    return summaries


@router.post("/clients", status_code=status.HTTP_201_CREATED, response_model=ClientSummary)
async def add_client(body: AddClientIn, user: SpecialistDep, db: DbDep):
    """Add a gym user to this specialist's roster by email (explicit assignment).

    Re-adding a previously removed client reactivates the relationship.
    """
    me = uuid.UUID(user.id)
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email is required")
    profile = (
        await db.execute(select(Profile).where(func.lower(Profile.email) == email))
    ).scalar_one_or_none()
    if profile is None or profile.role != "gym_user":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No gym user with that email")
    if await db.get(GymUser, profile.id) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="User is not a gym member")

    rel = await db.get(SpecialistClient, (me, profile.id))
    if rel is None:
        db.add(
            SpecialistClient(specialist_id=me, client_id=profile.id, status="active", created_at=_now())
        )
    elif rel.status == "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already one of your clients")
    else:
        rel.status = "active"
    await notify(
        db,
        recipient_id=profile.id,
        type="account",
        title="Added to a specialist's roster",
        body=f"{user.name or 'A wellness specialist'} is now your wellness specialist on OneFit.",
    )
    await db.commit()
    return await _client_row(db, profile)


@router.delete("/clients/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_client(user_id: uuid.UUID, user: SpecialistDep, db: DbDep):
    """Remove a client from the roster (soft-delete; revokes access to their data)."""
    rel = await db.get(SpecialistClient, (uuid.UUID(user.id), user_id))
    if rel is None or rel.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    rel.status = "removed"
    await db.commit()


@router.get("/clients/{user_id}", response_model=ClientSummary)
async def get_client(user_id: uuid.UUID, user: SpecialistDep, db: DbDep):
    profile = await _require_active_client(db, uuid.UUID(user.id), user_id)
    return await _client_row(db, profile)


@router.get("/clients/{user_id}/activity")
async def client_activity(user_id: uuid.UUID, user: SpecialistDep, db: DbDep, limit: int = 20):
    await _require_active_client(db, uuid.UUID(user.id), user_id)
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.log_date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/clients/{user_id}/diet")
async def client_diet(user_id: uuid.UUID, user: SpecialistDep, db: DbDep, limit: int = 20):
    await _require_active_client(db, uuid.UUID(user.id), user_id)
    result = await db.execute(
        select(DietaryLog)
        .where(DietaryLog.user_id == user_id)
        .order_by(DietaryLog.log_date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/clients/{user_id}/progress")
async def client_progress(user_id: uuid.UUID, user: SpecialistDep, db: DbDep, limit: int = 20):
    await _require_active_client(db, uuid.UUID(user.id), user_id)
    result = await db.execute(
        select(ProgressEntry)
        .where(ProgressEntry.user_id == user_id)
        .order_by(ProgressEntry.recorded_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


# --- Meal plans (specialist-authored) ---------------------------------------
async def _notify_plan_published(db: AsyncSession, plan: MealPlan) -> None:
    """Tell a client their plan went live. Called on the draft -> published edge."""
    await notify(
        db,
        recipient_id=plan.client_id,
        type="meal_plan",
        title=f"New meal plan: {plan.name}",
        body=(
            f"Your specialist published a {plan.days_per_week}-day plan focused on "
            f"{plan.goal}. Open the Meal Plans tab to view the full plan."
        ),
        ref_type="meal_plan",
        ref_id=plan.plan_id,
    )


def _require_owned_plan_status(value: str) -> None:
    if value not in VALID_MEAL_PLAN_STATUS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"status must be one of {sorted(VALID_MEAL_PLAN_STATUS)}",
        )


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
    """Create a meal plan. Defaults to a draft; pass status='published' (with a
    client) to author-and-publish in one step. A targeted plan/publish must go to
    one of this specialist's own clients."""
    me = uuid.UUID(user.id)
    _require_owned_plan_status(body.status)
    publish = body.status == "published"
    if publish and body.client_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Select a client to publish the plan to.",
        )
    if body.client_id is not None:
        await _require_active_client(db, me, body.client_id)

    plan = MealPlan(
        plan_id=uuid.uuid4(),
        specialist_id=me,
        client_id=body.client_id,
        name=body.name,
        goal=body.goal,
        days_per_week=body.days_per_week,
        payload=body.payload,
        status=body.status,
        created_at=_now(),
    )
    db.add(plan)
    if publish:
        await _notify_plan_published(db, plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/meal-plans/{plan_id}", response_model=MealPlanOut)
async def update_meal_plan(plan_id: uuid.UUID, body: MealPlanUpdate, user: SpecialistDep, db: DbDep):
    """Edit a plan and/or transition draft -> published (owner only).

    Editing an already-published plan updates it in place without re-notifying;
    only the first draft -> published transition fires the client notification.
    """
    me = uuid.UUID(user.id)
    plan = await db.get(MealPlan, plan_id)
    if plan is None or plan.specialist_id != me:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")

    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        _require_owned_plan_status(data["status"])

    # Resolve the effective target client + whether this edit publishes the plan,
    # and validate BEFORE mutating so a bad publish leaves the row untouched.
    target_client = data["client_id"] if "client_id" in data else plan.client_id
    publish_now = data.get("status") == "published" and plan.status != "published"
    if publish_now:
        if target_client is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Select a client to publish the plan to.",
            )
        await _require_active_client(db, me, target_client)
    elif "client_id" in data and target_client is not None:
        await _require_active_client(db, me, target_client)

    for field in ("name", "goal", "days_per_week", "payload", "client_id", "status"):
        if field in data and data[field] is not None:
            setattr(plan, field, data[field])

    if publish_now:
        await _notify_plan_published(db, plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/meal-plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_plan(plan_id: uuid.UUID, user: SpecialistDep, db: DbDep):
    """Delete a meal plan (owner only). Works for drafts and published plans."""
    plan = await db.get(MealPlan, plan_id)
    if plan is None or plan.specialist_id != uuid.UUID(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    await db.delete(plan)
    await db.commit()


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
        title=f"New wellness task: {body.type}",
        body=f"{body.description}\n\nDue {body.due_date.isoformat()}.",
        ref_type="task",
        ref_id=task.task_id,
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
                title="Post escalated for review",
                body=f"Post {post_id} was escalated for admin review (severity {post.severity}).",
                ref_type="community_post",
                ref_id=post_id,
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

    await notify(
        db,
        recipient_id=post.author_id,
        type="moderation",
        title="Moderation update",
        body=author_msg,
        ref_type="community_post",
        ref_id=post_id,
    )
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
    recommendation = recommend_from_trends(
        adherence, avg_calories, activity_consistency, milestone_rate
    )
    return {
        "report_id": report.report_id,
        "specialist_id": report.specialist_id,
        "cohort": report.cohort,
        "period": report.period,
        "adherence": report.adherence,
        "avg_calories": report.avg_calories,
        "activity_consistency": report.activity_consistency,
        "milestone_rate": report.milestone_rate,
        "created_at": report.created_at,
        "recommendation": recommendation,
    }
