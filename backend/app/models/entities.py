"""SQLAlchemy ORM models mapping the OneFit schema (SDD §3.2).

These map onto tables created by supabase/migrations/0001_init.sql. Column names
and types mirror the data dictionary. The schema source of truth is the SQL
migration, not these models.
"""

import datetime as dt
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


# --- Postgres enum types ----------------------------------------------------
# These mirror the `create type ... as enum` definitions in
# supabase/migrations/0001_init.sql. SQL is the source of truth for the schema,
# so every type is declared with create_type=False / checkfirst — SQLAlchemy
# binds values as the native enum (so writes cast correctly) without trying to
# CREATE or DROP the type. Mapping these as plain String makes reads work but
# breaks INSERT/UPDATE: Postgres won't implicitly cast varchar -> enum.
def _pg_enum(name: str, *values: str) -> ENUM:
    return ENUM(*values, name=name, create_type=False)


user_role_enum = _pg_enum("user_role", "gym_user", "wellness_specialist", "admin")
account_status_enum = _pg_enum("account_status", "pending", "active", "suspended")
membership_status_enum = _pg_enum("membership_status", "active", "suspended")
specialist_approval_enum = _pg_enum("specialist_approval", "pending", "approved", "rejected")
specialist_client_status_enum = _pg_enum("specialist_client_status", "active", "removed")
plan_status_enum = _pg_enum("plan_status", "active", "superseded")
session_status_enum = _pg_enum("session_status", "scheduled", "completed", "missed")
activity_source_enum = _pg_enum("activity_source", "manual", "wearable")
activity_status_enum = _pg_enum("activity_status", "pending", "completed")
meal_time_enum = _pg_enum("meal_time", "breakfast", "lunch", "dinner", "snack")
entry_mode_enum = _pg_enum("entry_mode", "quick", "detailed")
task_status_enum = _pg_enum(
    "task_status",
    "Assigned", "InProgress", "Submitted", "UnderReview", "Completed", "Overdue", "Cancelled",
)
content_status_enum = _pg_enum("content_status", "Draft", "Published", "Archived", "Rejected")
post_status_enum = _pg_enum(
    "post_status", "Posted", "Flagged", "UnderReview", "Approved", "Removed", "Escalated",
)
post_severity_enum = _pg_enum("post_severity", "low", "medium", "high")
notification_status_enum = _pg_enum("notification_status", "read", "unread")
announcement_audience_enum = _pg_enum("announcement_audience", "all", "gym_users", "specialists")
announcement_status_enum = _pg_enum("announcement_status", "draft", "published")
meal_plan_status_enum = _pg_enum("meal_plan_status", "draft", "published")


# --- 3.2.1 User -> profiles -------------------------------------------------
class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    role: Mapped[str] = mapped_column(user_role_enum, default="gym_user")
    status: Mapped[str] = mapped_column(account_status_enum, default="pending")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.2 GymUser ----------------------------------------------------------
class GymUser(Base):
    __tablename__ = "gym_users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    membership_status: Mapped[str] = mapped_column(membership_status_enum, default="active")

    fitness_profile: Mapped["FitnessProfile"] = relationship(back_populates="gym_user", uselist=False)


# --- 3.2.4 WellnessSpecialist ----------------------------------------------
class WellnessSpecialist(Base):
    __tablename__ = "wellness_specialists"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    specialization: Mapped[str] = mapped_column(Text)
    certification_doc: Mapped[str | None] = mapped_column(Text)
    approval_status: Mapped[str] = mapped_column(specialist_approval_enum, default="pending")


# --- 3.2.5 Admin ------------------------------------------------------------
class Admin(Base):
    __tablename__ = "admins"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    permissions: Mapped[str | None] = mapped_column(Text)


# --- 3.2.3 FitnessProfile ---------------------------------------------------
class FitnessProfile(Base):
    __tablename__ = "fitness_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE"), primary_key=True
    )
    age: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[float | None] = mapped_column(Numeric(5, 2))
    weight: Mapped[float | None] = mapped_column(Numeric(5, 2))
    body_fat_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    fitness_goal: Mapped[str | None] = mapped_column(Text)

    gym_user: Mapped["GymUser"] = relationship(back_populates="fitness_profile")


# --- 3.2.6 WorkoutPlan ------------------------------------------------------
class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    goal: Mapped[str] = mapped_column(Text)
    generated_by: Mapped[str] = mapped_column(String, default="manual")  # text column, not an enum
    status: Mapped[str] = mapped_column(plan_status_enum, default="active")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- Exercises (SDS data-design summary p.45; no §3.2.x dictionary entry) ----
# Per-exercise breakdown of a workout_plan. The SDS lists the table and its PK
# (exercise_id) but specifies no columns; the shape here follows the conventions
# of the surrounding tables and is created by 0005_exercises.sql.
class Exercise(Base):
    __tablename__ = "exercises"

    exercise_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workout_plans.plan_id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(Text)
    sets: Mapped[int | None] = mapped_column(Integer)
    reps: Mapped[int | None] = mapped_column(Integer)
    rest_seconds: Mapped[int | None] = mapped_column(Integer)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.7 WorkoutSession ---------------------------------------------------
class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workout_plans.plan_id", ondelete="CASCADE")
    )
    scheduled_date: Mapped[dt.date] = mapped_column(Date)
    scheduled_time: Mapped[dt.time] = mapped_column(Time)
    reminder_set: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(session_status_enum, default="scheduled")


# --- 3.2.8 ActivityLog ------------------------------------------------------
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    workout_type: Mapped[str | None] = mapped_column(Text)
    duration: Mapped[int | None] = mapped_column(Integer)
    steps: Mapped[int | None] = mapped_column(Integer)
    heart_rate: Mapped[int | None] = mapped_column(Integer)
    calories_burned: Mapped[float | None] = mapped_column(Numeric(7, 2))
    source: Mapped[str] = mapped_column(activity_source_enum, default="manual")
    log_date: Mapped[dt.date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(activity_status_enum, default="pending")


# --- 3.2.9 DietaryLog -------------------------------------------------------
class DietaryLog(Base):
    __tablename__ = "dietary_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    meal_time: Mapped[str | None] = mapped_column(meal_time_enum)
    food_item: Mapped[str | None] = mapped_column(Text)
    calories: Mapped[float] = mapped_column(Numeric(7, 2))
    protein: Mapped[float | None] = mapped_column(Numeric(6, 2))
    carbs: Mapped[float | None] = mapped_column(Numeric(6, 2))
    fat: Mapped[float | None] = mapped_column(Numeric(6, 2))
    entry_mode: Mapped[str] = mapped_column(entry_mode_enum, default="quick")
    log_date: Mapped[dt.date] = mapped_column(Date)


# --- 3.2.10 ProgressEntry ---------------------------------------------------
class ProgressEntry(Base):
    __tablename__ = "progress_entries"

    progress_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    weight: Mapped[float | None] = mapped_column(Numeric(5, 2))
    body_fat_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    height: Mapped[float | None] = mapped_column(Numeric(5, 2))
    photo_url: Mapped[str | None] = mapped_column(Text)
    recorded_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.11 Milestone -------------------------------------------------------
class Milestone(Base):
    __tablename__ = "milestones"

    milestone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(Text)
    badge: Mapped[str | None] = mapped_column(Text)
    achieved_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.12 WellnessTask ----------------------------------------------------
class WellnessTask(Base):
    __tablename__ = "wellness_tasks"

    task_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wellness_specialists.user_id", ondelete="CASCADE")
    )
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))  # polymorphic: gym user or group
    type: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    target_metric: Mapped[str | None] = mapped_column(Text)
    due_date: Mapped[dt.date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(task_status_enum, default="Assigned")


# --- 3.2.13 EducationalContent ----------------------------------------------
class EducationalContent(Base):
    __tablename__ = "educational_content"

    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wellness_specialists.user_id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text)
    media_url: Mapped[str | None] = mapped_column(Text)
    visibility: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(content_status_enum, default="Draft")
    permission_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.14 Feedback --------------------------------------------------------
class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wellness_specialists.user_id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    notes: Mapped[str] = mapped_column(Text)
    plan_updated: Mapped[bool] = mapped_column(Boolean, default=False)
    submitted_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.15 CommunityGroup --------------------------------------------------
class CommunityGroup(Base):
    __tablename__ = "community_groups"

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wellness_specialists.user_id", ondelete="CASCADE")
    )


# --- 3.2.16 CommunityPost ---------------------------------------------------
class CommunityPost(Base):
    __tablename__ = "community_posts"

    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("community_groups.group_id", ondelete="CASCADE")
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(post_status_enum, default="Posted")
    severity: Mapped[str | None] = mapped_column(post_severity_enum)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.17 Notification ----------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(Text)
    message: Mapped[str] = mapped_column(Text)
    # Structured content (0009): title/body split + a generic reference to the
    # source entity so the detail view can render a full body and deep-link.
    # `message` is kept and still populated for backward compatibility.
    title: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    ref_type: Mapped[str | None] = mapped_column(Text)
    ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    status: Mapped[str] = mapped_column(notification_status_enum, default="unread")
    sent_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.18 Announcement ----------------------------------------------------
class Announcement(Base):
    __tablename__ = "announcements"

    announcement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.user_id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    target_audience: Mapped[str] = mapped_column(announcement_audience_enum, default="all")
    status: Mapped[str] = mapped_column(announcement_status_enum, default="draft")
    sent_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


# --- 3.2.19 HealthTrendReport -----------------------------------------------
class HealthTrendReport(Base):
    __tablename__ = "health_trend_reports"

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wellness_specialists.user_id", ondelete="CASCADE")
    )
    cohort: Mapped[str] = mapped_column(Text)
    period: Mapped[str] = mapped_column(Text)
    adherence: Mapped[float | None] = mapped_column(Numeric(5, 2))
    avg_calories: Mapped[float | None] = mapped_column(Numeric(7, 2))
    activity_consistency: Mapped[float | None] = mapped_column(Numeric(5, 2))
    milestone_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- MealPlan (specialist-authored, 0004 migration) -------------------------
class MealPlan(Base):
    __tablename__ = "meal_plans"

    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wellness_specialists.user_id", ondelete="CASCADE")
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(Text)
    goal: Mapped[str] = mapped_column(Text, default="maintain")
    days_per_week: Mapped[int] = mapped_column(Integer, default=7)
    payload: Mapped[list | dict] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(meal_plan_status_enum, default="draft")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- SpecialistClient relationship (0007 migration) -------------------------
# The authoritative specialist <-> client link. A gym user is a specialist's
# client only via an 'active' row here; all specialist roster/detail/action
# queries scope to this relationship (replacing the old role == 'gym_user' match).
class SpecialistClient(Base):
    __tablename__ = "specialist_clients"

    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wellness_specialists.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("gym_users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    status: Mapped[str] = mapped_column(specialist_client_status_enum, default="active")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.20 AuditLog --------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(Text)
    details: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- Consultation messages (B15; table from 0013_messages.sql) --------------
class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE")
    )
    body: Mapped[str] = mapped_column(Text)
    read_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- Login attempt audit (C16; table from 0014_login_events.sql) ------------
class LoginEvent(Base):
    __tablename__ = "login_events"

    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    success: Mapped[bool] = mapped_column(Boolean)
    ip: Mapped[str | None] = mapped_column(Text)
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
