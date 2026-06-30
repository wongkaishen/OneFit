import datetime as dt

from app.services.metrics import weekly_consistency


def test_counts_active_days_in_trailing_week():
    today = dt.date(2026, 6, 28)
    active = {today, today - dt.timedelta(days=2), today - dt.timedelta(days=8)}
    result = weekly_consistency(active, today)
    assert result["active_days_this_week"] == 2  # the day-8 one is outside the window
    assert result["weekly_goal"] == 7


def test_streak_counts_consecutive_days_up_to_today():
    today = dt.date(2026, 6, 28)
    active = {today, today - dt.timedelta(days=1), today - dt.timedelta(days=2)}
    assert weekly_consistency(active, today)["current_streak"] == 3


def test_streak_breaks_on_gap():
    today = dt.date(2026, 6, 28)
    active = {today, today - dt.timedelta(days=2)}
    assert weekly_consistency(active, today)["current_streak"] == 1


def test_no_activity_today_means_zero_streak():
    today = dt.date(2026, 6, 28)
    active = {today - dt.timedelta(days=1)}
    assert weekly_consistency(active, today)["current_streak"] == 0
