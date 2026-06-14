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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


# --- 3.2.1 User -> profiles -------------------------------------------------
class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    role: Mapped[str] = mapped_column(String, default="gym_user")
    status: Mapped[str] = mapped_column(String, default="pending")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# --- 3.2.2 GymUser ----------------------------------------------------------
class GymUser(Base):
    __tablename__ = "gym_users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    membership_status: Mapped[str] = mapped_column(String, default="active")

    fitness_profile: Mapped["FitnessProfile"] = relationship(back_populates="gym_user", uselist=False)


# --- 3.2.4 WellnessSpecialist ----------------------------------------------
class WellnessSpecialist(Base):
    __tablename__ = "wellness_specialists"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    specialization: Mapped[str] = mapped_column(Text)
    certification_doc: Mapped[str | None] = mapped_column(Text)
    approval_status: Mapped[str] = mapped_column(String, default="pending")


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
    generated_by: Mapped[str] = mapped_column(String, default="manual")
    status: Mapped[str] = mapped_column(String, default="active")
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
    status: Mapped[str] = mapped_column(String, default="scheduled")


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
    source: Mapped[str] = mapped_column(String, default="manual")
    log_date: Mapped[dt.date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String, default="pending")


# --- 3.2.9 DietaryLog -------------------------------------------------------
class DietaryLog(Base):
    __tablename__ = "dietary_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gym_users.user_id", ondelete="CASCADE")
    )
    meal_time: Mapped[str | None] = mapped_column(String)
    food_item: Mapped[str | None] = mapped_column(Text)
    calories: Mapped[float] = mapped_column(Numeric(7, 2))
    protein: Mapped[float | None] = mapped_column(Numeric(6, 2))
    carbs: Mapped[float | None] = mapped_column(Numeric(6, 2))
    fat: Mapped[float | None] = mapped_column(Numeric(6, 2))
    entry_mode: Mapped[str] = mapped_column(String, default="quick")
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
    status: Mapped[str] = mapped_column(String, default="Assigned")


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
    status: Mapped[str] = mapped_column(String, default="Draft")
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
    status: Mapped[str] = mapped_column(String, default="Posted")
    severity: Mapped[str | None] = mapped_column(String)
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
    status: Mapped[str] = mapped_column(String, default="unread")
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
    target_audience: Mapped[str] = mapped_column(String, default="all")
    status: Mapped[str] = mapped_column(String, default="draft")
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
