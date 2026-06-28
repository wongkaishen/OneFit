"""Weekly consistency metrics (Gym User A14).

Pure aggregation over the set of dates a user was active (logged activity or
diet). No DB — the router gathers the dates and passes them in.
"""

import datetime as dt

WEEKLY_GOAL_DAYS = 7


def weekly_consistency(active_dates: set[dt.date], today: dt.date) -> dict:
    """Active-days-this-week and current streak from a set of active dates."""
    window = {today - dt.timedelta(days=i) for i in range(WEEKLY_GOAL_DAYS)}
    active_this_week = len(window & active_dates)

    streak = 0
    cursor = today
    while cursor in active_dates:
        streak += 1
        cursor -= dt.timedelta(days=1)

    return {
        "active_days_this_week": active_this_week,
        "current_streak": streak,
        "weekly_goal": WEEKLY_GOAL_DAYS,
    }
