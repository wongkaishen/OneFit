"""Milestone auto-awarding (SDD §3.2.11 + Gym User UC7).

Called from gym_user write endpoints after each activity/diet/progress log.
Inserts new Milestone rows for rules the user has just satisfied. The caller
commits — these adds participate in the same transaction as the triggering write.
"""

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog, DietaryLog, Milestone, ProgressEntry
from app.services.notification import notify


async def _has_badge(db: AsyncSession, user_id: uuid.UUID, type_: str) -> bool:
    result = await db.execute(
        select(Milestone.milestone_id).where(
            Milestone.user_id == user_id, Milestone.type == type_
        )
    )
    return result.first() is not None


def _add(db: AsyncSession, user_id: uuid.UUID, type_: str, badge: str) -> Milestone:
    m = Milestone(
        milestone_id=uuid.uuid4(),
        user_id=user_id,
        type=type_,
        badge=badge,
        achieved_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(m)
    return m


async def check_and_award(db: AsyncSession, user_id: uuid.UUID) -> list[Milestone]:
    """Evaluate every rule against the user's current state, insert missing badges."""
    awarded: list[Milestone] = []

    # Rule 1: First activity logged
    if not await _has_badge(db, user_id, "welcome"):
        first_activity = (
            await db.execute(
                select(ActivityLog.log_id).where(ActivityLog.user_id == user_id).limit(1)
            )
        ).first()
        if first_activity is not None:
            awarded.append(_add(db, user_id, "welcome", "First Step"))

    # Rule 2: First meal logged
    if not await _has_badge(db, user_id, "nutrition-start"):
        first_meal = (
            await db.execute(
                select(DietaryLog.log_id).where(DietaryLog.user_id == user_id).limit(1)
            )
        ).first()
        if first_meal is not None:
            awarded.append(_add(db, user_id, "nutrition-start", "First Meal Logged"))

    # Rule 3: 7-day activity streak (≥7 distinct log_dates in last 7 days)
    if not await _has_badge(db, user_id, "week-streak"):
        since = dt.date.today() - dt.timedelta(days=6)
        recent_dates = (
            await db.execute(
                select(ActivityLog.log_date)
                .where(ActivityLog.user_id == user_id, ActivityLog.log_date >= since)
            )
        ).scalars().all()
        if len({d for d in recent_dates}) >= 7:
            awarded.append(_add(db, user_id, "week-streak", "7-Day Streak"))

    # Rule 4: 5kg lost from first recorded weight
    if not await _has_badge(db, user_id, "5kg-down"):
        weights = (
            await db.execute(
                select(ProgressEntry.weight, ProgressEntry.recorded_at)
                .where(ProgressEntry.user_id == user_id, ProgressEntry.weight.is_not(None))
                .order_by(ProgressEntry.recorded_at.asc())
            )
        ).all()
        if len(weights) >= 2:
            first = float(weights[0][0])
            latest = float(weights[-1][0])
            if first - latest >= 5:
                awarded.append(_add(db, user_id, "5kg-down", "5kg Lost"))

    # Celebrate each newly earned badge in the same transaction as the award.
    for m in awarded:
        await notify(
            db,
            recipient_id=user_id,
            type="milestone",
            title="New milestone unlocked",
            body=f"You earned the “{m.badge}” badge. Keep it up!",
            ref_type="milestone",
            ref_id=m.milestone_id,
        )

    return awarded
