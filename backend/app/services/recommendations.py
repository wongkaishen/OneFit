"""Trend-based program recommendation (Wellness Specialist B21).

Turns the aggregate metrics of a HealthTrendReport into one actionable
recommendation string. Pure function — unit-tested directly, surfaced by the
specialist's create-health-trend endpoint and reports page.
"""

ADHERENCE_FLOOR = 60.0
ACTIVITY_FLOOR = 50.0
MILESTONE_FLOOR = 40.0


def recommend_from_trends(
    adherence: float | None,
    avg_calories: float | None,
    activity_consistency: float | None,
    milestone_rate: float | None,
) -> str:
    """One prioritized, plain-language recommendation from cohort aggregates."""
    notes: list[str] = []
    if adherence is not None and adherence < ADHERENCE_FLOOR:
        notes.append(
            f"Session adherence is low ({adherence:.0f}%). Consider shorter, more "
            "frequent sessions or reminders to lift adherence."
        )
    if activity_consistency is not None and activity_consistency < ACTIVITY_FLOOR:
        notes.append(
            f"Only {activity_consistency:.0f}% of users log activity regularly. "
            "Boost engagement with a weekly challenge or check-in."
        )
    if milestone_rate is not None and milestone_rate < MILESTONE_FLOOR:
        notes.append(
            f"Milestone completion is {milestone_rate:.0f}%. Set smaller, "
            "achievable goals so more users hit a milestone."
        )
    if not notes:
        return "Cohort metrics are healthy — members are on track. Keep the current program."
    return " ".join(notes)
