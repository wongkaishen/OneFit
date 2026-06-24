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
    DietaryLog,
    GymUser,
    Notification,
    Profile,
    ProgressEntry,
    WellnessSpecialist,
    WorkoutPlan,
    WorkoutSession,
)
from app.services.audit import record_audit
from app.services.notification import notify

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
    result = await db.execute(
        select(Announcement).order_by(
            Announcement.sent_at.desc().nullslast(),
            Announcement.announcement_id.desc(),
        )
    )
    return result.scalars().all()


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
    for rid in recipients:
        await notify(
            db,
            recipient_id=rid,
            type="announcement",
            title=body.title,
            body=body.body,
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
    return ann


# --- UC4: Approve Member Registration ---------------------------------------
class RejectIn(BaseModel):
    reason: str = ""


@router.get("/registrations", response_model=list[UserOut])
async def list_registrations(admin: AdminDep, db: DbDep):
    """Pending-registration queue (UC4): profiles still awaiting approval."""
    result = await db.execute(
        select(Profile).where(Profile.status == "pending").order_by(Profile.created_at)
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


# --- UC8: Send Notification to Member ---------------------------------------
class NotifyIn(BaseModel):
    message: str
    # "user" (needs user_id), "gym_users", "specialists", or "all".
    audience: str = "all"
    user_id: uuid.UUID | None = None
    title: str | None = None


@router.post("/notifications", status_code=status.HTTP_201_CREATED)
async def send_notification(body: NotifyIn, admin: AdminDep, db: DbDep):
    """Dispatch a notification to a single user, a role group, or everyone (UC8)."""
    if not body.message.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message is required")

    if body.audience == "user":
        if body.user_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="audience 'user' requires user_id",
            )
        if await db.get(Profile, body.user_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        recipients = [body.user_id]
    elif body.audience in {"gym_users", "specialists", "all"}:
        stmt = select(Profile.id)
        if body.audience == "gym_users":
            stmt = stmt.where(Profile.role == "gym_user")
        elif body.audience == "specialists":
            stmt = stmt.where(Profile.role == "wellness_specialist")
        recipients = list((await db.execute(stmt)).scalars().all())
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="audience must be 'user', 'gym_users', 'specialists', or 'all'",
        )

    for rid in recipients:
        await notify(
            db,
            recipient_id=rid,
            type="admin_message",
            title=body.title or "Message from your admin",
            body=body.message,
        )
    await record_audit(db, actor_id=uuid.UUID(admin.id), action="send_notification",
                       details=f"{body.audience}: {len(recipients)} recipient(s)")
    await db.commit()
    return {"sent": len(recipients), "audience": body.audience}
