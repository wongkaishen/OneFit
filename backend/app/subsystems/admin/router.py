"""Admin subsystem (SDD §5.1.4).

View/manage users (UC2/UC3), approve registrations (UC4), suspend/reinstate
(UC5), assign roles (UC1), announcements (UC8), monitor activity (UC6).
All mutating actions write to the audit log per the SDD.
"""

import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, require_admin
from app.models import (
    ActivityLog,
    Admin,
    Announcement,
    AuditLog,
    CommunityGroup,
    CommunityPost,
    DietaryLog,
    Exercise,
    GymUser,
    LoginEvent,
    Message,
    Notification,
    Profile,
    ProgressEntry,
    Report,
    WellnessSpecialist,
    WorkoutPlan,
    WorkoutSession,
)
from app.services.audit import record_audit
from app.services.notification import notify
from app.services.storage import CREDENTIALS_BUCKET, signed_url

router = APIRouter(prefix="/admin", tags=["admin"])

AdminDep = Annotated[CurrentUser, Depends(require_admin)]
DbDep = Annotated[AsyncSession, Depends(get_db)]

VALID_STATUS = {"pending", "active", "suspended"}
VALID_ROLES = {"gym_user", "wellness_specialist", "admin"}
# Constrained by the announcement_audience enum in migration 0001.
VALID_AUDIENCE = {"all", "gym_users", "specialists"}


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


async def _ensure_admin_row(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Guarantee an `admins` subtype row exists for this admin.

    Admins are seeded by setting profiles.role='admin' directly in Supabase,
    which does NOT create the admins subtype row. Several admin writes
    (announcements) FK-reference admins.user_id, so provision it lazily here.
    """
    await db.execute(
        text("insert into public.admins (user_id) values (:id) on conflict do nothing"),
        {"id": user_id},
    )


class StatusUpdate(BaseModel):
    status: str


class RoleUpdate(BaseModel):
    role: str


class UserOut(BaseModel):
    """Serializes a `profiles` row into the shape the frontend expects."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    user_id: uuid.UUID = Field(validation_alias="id")
    name: str | None = None
    email: str
    role: str
    status: str
    created_at: dt.datetime


class AdminStats(BaseModel):
    total_users: int
    total_gym_users: int
    total_specialists: int
    total_admins: int
    pending_approvals: int
    active_today: int


class AuditEntry(BaseModel):
    log_id: uuid.UUID
    actor_id: uuid.UUID | None = None
    actor_name: str | None = None
    action: str
    details: str | None = None
    created_at: dt.datetime


class AnnouncementIn(BaseModel):
    title: str
    body: str
    target_audience: str = "all"


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    announcement_id: uuid.UUID
    admin_id: uuid.UUID
    admin_name: str | None = None
    title: str
    body: str
    target_audience: str
    status: str
    sent_at: dt.datetime | None = None


# --- UC3: View All Users ----------------------------------------------------
@router.get("/users", response_model=list[UserOut])
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
@router.patch("/users/{user_id}/status", response_model=UserOut)
async def set_user_status(user_id: uuid.UUID, body: StatusUpdate, admin: AdminDep, db: DbDep):
    if body.status not in VALID_STATUS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    profile = await db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile.status = body.status
    target = profile.name or profile.email or str(user_id)
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="set_user_status",
                       details=f"{target} -> {body.status}")
    await db.commit()
    await db.refresh(profile)
    return profile


# --- UC1: Assign role -------------------------------------------------------
@router.patch("/users/{user_id}/role", response_model=UserOut)
async def set_user_role(user_id: uuid.UUID, body: RoleUpdate, admin: AdminDep, db: DbDep):
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")
    profile = await db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile.role = body.role
    # Provision the subtype row for the new role if missing. The other subtype
    # rows are left in place — the FKs cascade only on profile deletion.
    if body.role == "gym_user":
        await db.execute(
            text("insert into public.gym_users (user_id) values (:id) on conflict do nothing"),
            {"id": str(user_id)},
        )
        await db.execute(
            text("insert into public.fitness_profiles (user_id) values (:id) on conflict do nothing"),
            {"id": str(user_id)},
        )
    elif body.role == "wellness_specialist":
        await db.execute(
            text(
                "insert into public.wellness_specialists (user_id, specialization) "
                "values (:id, 'general') on conflict do nothing"
            ),
            {"id": str(user_id)},
        )
    elif body.role == "admin":
        await db.execute(
            text("insert into public.admins (user_id) values (:id) on conflict do nothing"),
            {"id": str(user_id)},
        )
    target = profile.name or profile.email or str(user_id)
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="set_user_role",
                       details=f"{target} -> {body.role}")
    await db.commit()
    await db.refresh(profile)
    return profile


# --- C11: Per-user recent activity monitor ----------------------------------
@router.get("/users/{user_id}/activity")
async def user_activity(user_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """Per-user recent activity for the admin monitor (C11)."""
    if await db.get(Profile, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    activity = (await db.execute(
        select(ActivityLog).where(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.log_date.desc()).limit(10)
    )).scalars().all()
    diet = (await db.execute(
        select(DietaryLog).where(DietaryLog.user_id == user_id)
        .order_by(DietaryLog.log_date.desc()).limit(10)
    )).scalars().all()
    progress = (await db.execute(
        select(ProgressEntry).where(ProgressEntry.user_id == user_id)
        .order_by(ProgressEntry.recorded_at.desc()).limit(10)
    )).scalars().all()
    return {"recent_activity": activity, "recent_diet": diet, "recent_progress": progress}


# --- UC6: System overview / dashboard stats ---------------------------------
@router.get("/stats", response_model=AdminStats)
async def stats(admin: AdminDep, db: DbDep):
    today = dt.date.today()
    total_users = (await db.execute(select(func.count()).select_from(Profile))).scalar() or 0
    total_gym = (await db.execute(select(func.count()).select_from(GymUser))).scalar() or 0
    total_spec = (await db.execute(select(func.count()).select_from(WellnessSpecialist))).scalar() or 0
    total_admin = (await db.execute(select(func.count()).select_from(Admin))).scalar() or 0
    pending = (
        await db.execute(select(func.count()).select_from(Profile).where(Profile.status == "pending"))
    ).scalar() or 0

    # Distinct gym users who wrote *any* log today.
    today_activity = (
        await db.execute(
            select(ActivityLog.user_id).where(ActivityLog.log_date == today)
        )
    ).scalars().all()
    today_diet = (
        await db.execute(
            select(DietaryLog.user_id).where(DietaryLog.log_date == today)
        )
    ).scalars().all()
    today_progress = (
        await db.execute(
            select(ProgressEntry.user_id).where(func.date(ProgressEntry.recorded_at) == today)
        )
    ).scalars().all()
    active_today = len({*today_activity, *today_diet, *today_progress})

    return AdminStats(
        total_users=total_users,
        total_gym_users=total_gym,
        total_specialists=total_spec,
        total_admins=total_admin,
        pending_approvals=pending,
        active_today=active_today,
    )


@router.get("/audit-log", response_model=list[AuditEntry])
async def audit_log(admin: AdminDep, db: DbDep, limit: int = 20):
    stmt = (
        select(AuditLog, Profile.name)
        .outerjoin(Profile, Profile.id == AuditLog.actor_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [
        AuditEntry(
            log_id=log.log_id,
            actor_id=log.actor_id,
            actor_name=actor_name,
            action=log.action,
            details=log.details,
            created_at=log.created_at,
        )
        for log, actor_name in rows
    ]


# --- UC8: Announcements -----------------------------------------------------
@router.get("/announcements", response_model=list[AnnouncementOut])
async def list_announcements(admin: AdminDep, db: DbDep):
    rows = (
        await db.execute(
            select(Announcement, Profile.name)
            .outerjoin(Profile, Profile.id == Announcement.admin_id)
            .order_by(
                Announcement.sent_at.desc().nullslast(),
                Announcement.announcement_id.desc(),
            )
        )
    ).all()
    return [
        AnnouncementOut(
            announcement_id=a.announcement_id,
            admin_id=a.admin_id,
            admin_name=name,
            title=a.title,
            body=a.body,
            target_audience=a.target_audience,
            status=a.status,
            sent_at=a.sent_at,
        )
        for a, name in rows
    ]


@router.post("/announcements", status_code=status.HTTP_201_CREATED, response_model=AnnouncementOut)
async def create_announcement(body: AnnouncementIn, admin: AdminDep, db: DbDep):
    if body.target_audience not in VALID_AUDIENCE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"target_audience must be one of {sorted(VALID_AUDIENCE)}",
        )
    # Seeded admins (profiles.role='admin') may lack the admins subtype row the
    # announcement FK requires — provision it before inserting.
    await _ensure_admin_row(db, uuid.UUID(admin.id))

    ann = Announcement(
        announcement_id=uuid.uuid4(),
        admin_id=uuid.UUID(admin.id),
        title=body.title,
        body=body.body,
        target_audience=body.target_audience,
        status="published",
        sent_at=_now(),
    )
    db.add(ann)

    # Fan-out: one notification per profile matching the audience.
    audience_stmt = select(Profile.id)
    if body.target_audience == "gym_users":
        audience_stmt = audience_stmt.where(Profile.role == "gym_user")
    elif body.target_audience == "specialists":
        audience_stmt = audience_stmt.where(Profile.role == "wellness_specialist")
    recipients = (await db.execute(audience_stmt)).scalars().all()
    author = admin.name or "OneFit Admin"
    # Attribute the announcement so recipients can see who posted it.
    body_with_author = f"{body.body}\n\n— {author}" if body.body.strip() else f"— {author}"
    for rid in recipients:
        await notify(
            db,
            recipient_id=rid,
            type="announcement",
            title=body.title,
            body=body_with_author,
            ref_type="announcement",
            ref_id=ann.announcement_id,
        )

    await record_audit(
        db,
        actor_id=uuid.UUID(admin.id),
        action="create_announcement",
        details=f"{body.target_audience}: {body.title}",
    )
    await db.commit()
    await db.refresh(ann)
    return AnnouncementOut(
        announcement_id=ann.announcement_id,
        admin_id=ann.admin_id,
        admin_name=admin.name,
        title=ann.title,
        body=ann.body,
        target_audience=ann.target_audience,
        status=ann.status,
        sent_at=ann.sent_at,
    )


# --- UC4: Approve Member Registration ---------------------------------------
class RejectIn(BaseModel):
    reason: str = ""


@router.get("/registrations", response_model=list[UserOut])
async def list_registrations(admin: AdminDep, db: DbDep):
    """Pending specialist queue (UC4/B3): specialists still awaiting approval.

    Gym users are active on sign-up (they confirm their own email via Supabase),
    so only wellness specialists are gated behind admin approval and appear here.
    """
    result = await db.execute(
        select(Profile)
        .where(Profile.status == "pending", Profile.role == "wellness_specialist")
        .order_by(Profile.created_at)
    )
    return result.scalars().all()


@router.post("/registrations/{user_id}/approve", response_model=UserOut)
async def approve_registration(user_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """Approve a pending applicant: activate the account and send a welcome."""
    profile = await db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if profile.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User is not pending approval (status={profile.status})",
        )
    profile.status = "active"
    await notify(
        db,
        recipient_id=user_id,
        type="account",
        title="Welcome to OneFit!",
        body="Your account has been approved. You now have full access to the app.",
    )
    target = profile.name or profile.email or str(user_id)
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="approve_registration",
                       details=f"{target} approved")
    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/registrations/{user_id}/reject", response_model=UserOut)
async def reject_registration(user_id: uuid.UUID, body: RejectIn, admin: AdminDep, db: DbDep):
    """Reject a pending applicant: record the reason and notify them.

    account_status has no 'rejected' value, so a rejected applicant is moved to
    'suspended' (no access); the reason is preserved in the audit log + notification.
    """
    profile = await db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if profile.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User is not pending approval (status={profile.status})",
        )
    profile.status = "suspended"
    reason = body.reason.strip() or "No reason provided"
    await notify(
        db,
        recipient_id=user_id,
        type="account",
        title="Registration update",
        body=f"Your OneFit registration was not approved. Reason: {reason}",
    )
    target = profile.name or profile.email or str(user_id)
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="reject_registration",
                       details=f"{target}: {reason}")
    await db.commit()
    await db.refresh(profile)
    return profile


# --- UC7: Remove Inactive Program -------------------------------------------
class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: uuid.UUID
    user_id: uuid.UUID
    goal: str
    status: str
    created_at: dt.datetime
    last_activity_at: dt.datetime | None = None


@router.get("/programs")
async def list_programs(admin: AdminDep, db: DbDep, inactive_days: int = 30):
    """Program list filtered by inactivity (UC7).

    A program's last activity is the latest scheduled session date, falling back
    to its creation time. Returns active programs whose last activity is older
    than `inactive_days`.
    """
    cutoff = _now() - dt.timedelta(days=inactive_days)
    last_session = (
        select(
            WorkoutSession.plan_id.label("plan_id"),
            func.max(WorkoutSession.scheduled_date).label("last_date"),
        )
        .group_by(WorkoutSession.plan_id)
        .subquery()
    )
    rows = (
        await db.execute(
            select(WorkoutPlan, last_session.c.last_date)
            .join(last_session, last_session.c.plan_id == WorkoutPlan.plan_id, isouter=True)
            .where(WorkoutPlan.status == "active")
            .order_by(WorkoutPlan.created_at)
        )
    ).all()

    out: list[dict] = []
    for plan, last_date in rows:
        last_dt = (
            dt.datetime.combine(last_date, dt.time(), tzinfo=dt.timezone.utc)
            if last_date is not None
            else plan.created_at
        )
        if last_dt < cutoff:
            out.append(
                {
                    "plan_id": plan.plan_id,
                    "user_id": plan.user_id,
                    "goal": plan.goal,
                    "status": plan.status,
                    "created_at": plan.created_at,
                    "last_activity_at": last_dt,
                }
            )
    return out


@router.post("/programs/{plan_id}/remove")
async def remove_program(plan_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """Archive an inactive program and detach its upcoming sessions (UC7)."""
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")
    plan.status = "superseded"  # archived: kept for history, no longer active
    # Detach from active plans: mark its still-scheduled sessions as missed.
    detached = (
        await db.execute(
            text(
                "update public.workout_sessions set status='missed' "
                "where plan_id = :pid and status='scheduled'"
            ),
            {"pid": str(plan_id)},
        )
    ).rowcount
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="remove_program",
                       details=f"plan {plan_id} archived; {detached} sessions detached")
    await db.commit()
    return {"plan_id": plan_id, "status": "superseded", "sessions_detached": detached}


# --- UC8: Send a direct message to one member -------------------------------
# Broadcasts to a role/everyone go through Announcements (the single broadcast
# tool). This endpoint is intentionally narrowed to a single recipient so the two
# do not overlap: Announcements = broadcast, this = targeted direct message.
class NotifyIn(BaseModel):
    message: str
    user_id: uuid.UUID
    title: str | None = None


@router.post("/notifications", status_code=status.HTTP_201_CREATED)
async def send_notification(body: NotifyIn, admin: AdminDep, db: DbDep):
    """Dispatch a direct notification to a single user (UC8).

    Role/all broadcasts are deliberately not supported here — use Announcements.
    """
    if not body.message.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message is required")
    if await db.get(Profile, body.user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await notify(
        db,
        recipient_id=body.user_id,
        type="admin_message",
        title=body.title or "Message from your admin",
        body=body.message,
    )
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="send_notification",
                       details=f"user {body.user_id}")
    await db.commit()
    return {"sent": 1, "user_id": body.user_id}


# --- C16: Login Events Monitor -----------------------------------------------
@router.get("/login-events")
async def login_events(admin: AdminDep, db: DbDep, hours: int = 24, failures_only: bool = False):
    """Recent login attempts with a suspicious flag (>=5 failures/email/window) (C16)."""
    since = _now() - dt.timedelta(hours=hours)
    stmt = (
        select(LoginEvent)
        .where(LoginEvent.created_at >= since)
        .order_by(LoginEvent.created_at.desc())
        .limit(500)  # cap at 500 rows so a brute-force can't materialize unbounded results
    )
    if failures_only:
        stmt = stmt.where(LoginEvent.success.is_(False))
    rows = (await db.execute(stmt)).scalars().all()
    # count failures per email in-window
    fail_counts: dict[str, int] = {}
    for r in rows:
        if not r.success:
            fail_counts[r.email] = fail_counts.get(r.email, 0) + 1
    return [
        {
            "event_id": r.event_id, "email": r.email, "success": r.success,
            "ip": r.ip, "user_agent": r.user_agent, "created_at": r.created_at,
            "suspicious": fail_counts.get(r.email, 0) >= 5,
        }
        for r in rows
    ]


# --- B2: View Specialist Credential -----------------------------------------
@router.get("/specialists/{user_id}/credential")
async def get_specialist_credential(user_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """Short-lived signed URL to a specialist's uploaded credential (B2)."""
    spec = await db.get(WellnessSpecialist, user_id)
    if spec is None or not spec.certification_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No credential on file")
    return {"url": await signed_url(CREDENTIALS_BUCKET, spec.certification_doc)}


# --- Admin community oversight ----------------------------------------------
# The admin moderates community content as the platform operator. Reading a
# group's posts (which carry author PII) and every mutation are written to the
# audit log for accountability (data-protection: lawful processing + audit).
class CommunityGroupOut(BaseModel):
    group_id: uuid.UUID
    name: str
    description: str | None = None
    specialist_id: uuid.UUID | None = None
    specialist_name: str | None = None
    post_count: int = 0


class CommunityPostOut(BaseModel):
    post_id: uuid.UUID
    group_id: uuid.UUID
    author_id: uuid.UUID | None = None
    author_name: str | None = None
    author_email: str | None = None
    content: str
    status: str
    severity: str | None = None
    created_at: dt.datetime


class PostPatch(BaseModel):
    content: str | None = None
    status: str | None = None


# Mirrors the community_posts.status (post_status) enum from migration 0001.
VALID_POST_STATUS = {"Posted", "Flagged", "UnderReview", "Approved", "Removed", "Escalated"}


@router.get("/community/groups", response_model=list[CommunityGroupOut])
async def admin_list_groups(admin: AdminDep, db: DbDep):
    """All community groups with their owning specialist and post counts."""
    count_sub = (
        select(CommunityPost.group_id, func.count().label("n"))
        .group_by(CommunityPost.group_id)
        .subquery()
    )
    rows = (
        await db.execute(
            select(CommunityGroup, Profile.name, count_sub.c.n)
            .outerjoin(Profile, Profile.id == CommunityGroup.specialist_id)
            .outerjoin(count_sub, count_sub.c.group_id == CommunityGroup.group_id)
            .order_by(CommunityGroup.name)
        )
    ).all()
    return [
        CommunityGroupOut(
            group_id=g.group_id,
            name=g.name,
            description=g.description,
            specialist_id=g.specialist_id,
            specialist_name=name,
            post_count=n or 0,
        )
        for g, name, n in rows
    ]


@router.get("/community/groups/{group_id}/posts", response_model=list[CommunityPostOut])
async def admin_list_posts(group_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """All posts in a group (including Removed) with author identity (audited)."""
    if await db.get(CommunityGroup, group_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    rows = (
        await db.execute(
            select(CommunityPost, Profile.name, Profile.email)
            .outerjoin(Profile, Profile.id == CommunityPost.author_id)
            .where(CommunityPost.group_id == group_id)
            .order_by(CommunityPost.created_at.desc())
        )
    ).all()
    # Accessing author PII for moderation is an audited event.
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="view_community_posts",
                       details=f"group {group_id}: {len(rows)} post(s)")
    await db.commit()
    return [
        CommunityPostOut(
            post_id=p.post_id,
            group_id=p.group_id,
            author_id=p.author_id,
            author_name=name,
            author_email=email,
            content=p.content,
            status=p.status,
            severity=p.severity,
            created_at=p.created_at,
        )
        for p, name, email in rows
    ]


@router.patch("/community/posts/{post_id}", response_model=CommunityPostOut)
async def admin_update_post(post_id: uuid.UUID, body: PostPatch, admin: AdminDep, db: DbDep):
    """Edit a post's content and/or moderate its status (audited)."""
    post = await db.get(CommunityPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    changes: list[str] = []
    if body.status is not None:
        if body.status not in VALID_POST_STATUS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"status must be one of {sorted(VALID_POST_STATUS)}",
            )
        post.status = body.status
        changes.append(f"status={body.status}")
    if body.content is not None:
        if not body.content.strip():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="content cannot be empty")
        post.content = body.content.strip()
        changes.append("content edited")
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="update_community_post",
                       details=f"post {post_id}: {', '.join(changes) or 'no change'}")
    await db.commit()
    await db.refresh(post)
    author = (
        await db.execute(select(Profile.name, Profile.email).where(Profile.id == post.author_id))
    ).first()
    return CommunityPostOut(
        post_id=post.post_id, group_id=post.group_id, author_id=post.author_id,
        author_name=author[0] if author else None, author_email=author[1] if author else None,
        content=post.content, status=post.status, severity=post.severity, created_at=post.created_at,
    )


@router.delete("/community/posts/{post_id}")
async def admin_delete_post(post_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """Remove a policy-violating post permanently (audited moderation action)."""
    post = await db.get(CommunityPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await db.delete(post)
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="delete_community_post",
                       details=f"post {post_id} deleted")
    await db.commit()
    return {"deleted": True, "post_id": post_id}


# --- Reports queue (issue #3 P1) --------------------------------------------
# Members report posts/messages/users; admins triage. Resolving a report can
# dismiss it, remove the offending post, or suspend the offending user. Reading
# reports exposes author/target PII and is audited; every resolution is audited.
class ReportOut(BaseModel):
    report_id: uuid.UUID
    reporter_id: uuid.UUID
    reporter_name: str | None = None
    target_type: str
    target_id: uuid.UUID
    reason: str | None = None
    status: str
    created_at: dt.datetime
    # Resolved target context for the queue UI:
    target_summary: str | None = None       # post content / message body excerpt
    target_user_id: uuid.UUID | None = None  # the user who can be suspended
    target_user_name: str | None = None


class ResolveIn(BaseModel):
    action: str  # 'dismiss' | 'remove_post' | 'suspend_user'
    note: str | None = None


VALID_REPORT_ACTION = {"dismiss", "remove_post", "suspend_user"}


async def _report_context(db: AsyncSession, r: Report) -> dict:
    """Resolve a report's target into a summary + the suspendable user."""
    summary: str | None = None
    target_user_id: uuid.UUID | None = None
    target_user_name: str | None = None
    if r.target_type == "post":
        post = await db.get(CommunityPost, r.target_id)
        if post is not None:
            summary = post.content[:200]
            target_user_id = post.author_id
    elif r.target_type == "message":
        msg = await db.get(Message, r.target_id)
        if msg is not None:
            summary = msg.body[:200]
            target_user_id = msg.sender_id
    elif r.target_type == "user":
        target_user_id = r.target_id
    if target_user_id is not None:
        tu = await db.get(Profile, target_user_id)
        target_user_name = tu.name if tu else None
    return {
        "target_summary": summary,
        "target_user_id": target_user_id,
        "target_user_name": target_user_name,
    }


@router.get("/reports", response_model=list[ReportOut])
async def list_reports(admin: AdminDep, db: DbDep, status_filter: str = "open"):
    """The moderation queue. Defaults to open reports; pass status_filter to widen."""
    stmt = (
        select(Report, Profile.name)
        .outerjoin(Profile, Profile.id == Report.reporter_id)
        .order_by(Report.created_at.desc())
        .limit(200)
    )
    if status_filter and status_filter != "all":
        stmt = stmt.where(Report.status == status_filter)
    rows = (await db.execute(stmt)).all()
    out: list[ReportOut] = []
    for r, reporter_name in rows:
        ctx = await _report_context(db, r)
        out.append(
            ReportOut(
                report_id=r.report_id,
                reporter_id=r.reporter_id,
                reporter_name=reporter_name,
                target_type=r.target_type,
                target_id=r.target_id,
                reason=r.reason,
                status=r.status,
                created_at=r.created_at,
                **ctx,
            )
        )
    # Reading reports surfaces author/target PII — audit the access.
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="view_reports",
                       details=f"{len(out)} report(s) [{status_filter}]")
    await db.commit()
    return out


@router.post("/reports/{report_id}/resolve", response_model=ReportOut)
async def resolve_report(report_id: uuid.UUID, body: ResolveIn, admin: AdminDep, db: DbDep):
    """Triage a report: dismiss, remove the post, or suspend the offending user."""
    if body.action not in VALID_REPORT_ACTION:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"action must be one of {sorted(VALID_REPORT_ACTION)}",
        )
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    if report.status != "open":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Report already {report.status}",
        )

    ctx = await _report_context(db, report)
    detail = f"report {report_id} ({report.target_type}) -> {body.action}"

    if body.action == "dismiss":
        report.status = "dismissed"
    elif body.action == "remove_post":
        if report.target_type != "post":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="remove_post applies only to post reports",
            )
        post = await db.get(CommunityPost, report.target_id)
        if post is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post already gone")
        post.status = "Removed"
        report.status = "actioned"
    elif body.action == "suspend_user":
        target_user_id = ctx["target_user_id"]
        if target_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No user associated with this report",
            )
        target = await db.get(Profile, target_user_id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")
        target.status = "suspended"
        report.status = "actioned"

    report.reviewed_by = uuid.UUID(admin.id)
    report.reviewed_at = _now()

    # Let the reporter know their report was handled.
    await notify(
        db,
        recipient_id=report.reporter_id,
        type="moderation",
        title="Your report was reviewed",
        body=f"Thanks — an admin reviewed your report and took action ({body.action.replace('_', ' ')}).",
    )
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="resolve_report", details=detail)
    await db.commit()
    await db.refresh(report)
    ctx = await _report_context(db, report)
    reporter = await db.get(Profile, report.reporter_id)
    return ReportOut(
        report_id=report.report_id,
        reporter_id=report.reporter_id,
        reporter_name=reporter.name if reporter else None,
        target_type=report.target_type,
        target_id=report.target_id,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        **ctx,
    )


# --- Admin program/plan management ------------------------------------------
# The admin can review and manage any gym user's workout program as the platform
# operator. Reads expose owner identity (PII) and are audited; removal archives
# rather than destroys to preserve history (retention, not destruction).
class AdminPlanOut(BaseModel):
    plan_id: uuid.UUID
    user_id: uuid.UUID
    owner_name: str | None = None
    owner_email: str | None = None
    goal: str
    generated_by: str
    status: str
    created_at: dt.datetime


class PlanPatch(BaseModel):
    goal: str | None = None
    status: str | None = None


VALID_PLAN_STATUS = {"active", "completed", "superseded"}


@router.get("/programs/all", response_model=list[AdminPlanOut])
async def admin_list_all_programs(admin: AdminDep, db: DbDep, status_filter: str | None = None):
    """Every workout plan (any status) with its owner, for admin oversight."""
    stmt = (
        select(WorkoutPlan, Profile.name, Profile.email)
        .outerjoin(Profile, Profile.id == WorkoutPlan.user_id)
        .order_by(WorkoutPlan.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(WorkoutPlan.status == status_filter)
    rows = (await db.execute(stmt)).all()
    return [
        AdminPlanOut(
            plan_id=p.plan_id, user_id=p.user_id, owner_name=name, owner_email=email,
            goal=p.goal, generated_by=p.generated_by, status=p.status, created_at=p.created_at,
        )
        for p, name, email in rows
    ]


@router.get("/programs/{plan_id}/detail")
async def admin_program_detail(plan_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """A plan with its exercises and scheduled sessions (audited PII access)."""
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")
    owner = (
        await db.execute(select(Profile.name, Profile.email).where(Profile.id == plan.user_id))
    ).first()
    exercises = (
        await db.execute(
            select(Exercise).where(Exercise.plan_id == plan_id).order_by(Exercise.order_index)
        )
    ).scalars().all()
    sessions = (
        await db.execute(
            select(WorkoutSession).where(WorkoutSession.plan_id == plan_id)
            .order_by(WorkoutSession.scheduled_date)
        )
    ).scalars().all()
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="view_program_detail",
                       details=f"plan {plan_id}")
    await db.commit()
    return {
        "plan_id": plan.plan_id,
        "user_id": plan.user_id,
        "owner_name": owner[0] if owner else None,
        "owner_email": owner[1] if owner else None,
        "goal": plan.goal,
        "generated_by": plan.generated_by,
        "status": plan.status,
        "created_at": plan.created_at,
        "exercises": [
            {
                "exercise_id": e.exercise_id, "name": e.name, "sets": e.sets, "reps": e.reps,
                "rest_seconds": e.rest_seconds, "order_index": e.order_index, "notes": e.notes,
            }
            for e in exercises
        ],
        "sessions": [
            {
                "session_id": s.session_id, "scheduled_date": s.scheduled_date, "status": s.status,
            }
            for s in sessions
        ],
    }


@router.patch("/programs/{plan_id}", response_model=AdminPlanOut)
async def admin_update_program(plan_id: uuid.UUID, body: PlanPatch, admin: AdminDep, db: DbDep):
    """Edit a plan's goal and/or status (audited)."""
    plan = await db.get(WorkoutPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")
    changes: list[str] = []
    if body.status is not None:
        if body.status not in VALID_PLAN_STATUS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"status must be one of {sorted(VALID_PLAN_STATUS)}",
            )
        plan.status = body.status
        changes.append(f"status={body.status}")
    if body.goal is not None:
        if not body.goal.strip():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="goal cannot be empty")
        plan.goal = body.goal.strip()
        changes.append("goal edited")
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="update_program",
                       details=f"plan {plan_id}: {', '.join(changes) or 'no change'}")
    await db.commit()
    await db.refresh(plan)
    owner = (
        await db.execute(select(Profile.name, Profile.email).where(Profile.id == plan.user_id))
    ).first()
    return AdminPlanOut(
        plan_id=plan.plan_id, user_id=plan.user_id,
        owner_name=owner[0] if owner else None, owner_email=owner[1] if owner else None,
        goal=plan.goal, generated_by=plan.generated_by, status=plan.status, created_at=plan.created_at,
    )
