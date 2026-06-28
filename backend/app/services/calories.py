"""MET-based calorie-burn estimation (Gym User A13).

When a gym user logs activity without entering calories burned, estimate it from
the workout type and duration using MET values (Compendium of Physical Activities,
rounded). Pure function — no DB — so it is unit-tested directly.
"""

# Substring-matched against the user's free-text workout_type, first match wins.
MET_TABLE: dict[str, float] = {
    "run": 9.8,
    "hiit": 8.5,
    "swim": 8.0,
    "cycl": 7.5,
    "bik": 7.5,
    "row": 7.0,
    "cardio": 7.0,
    "elliptical": 5.0,
    "strength": 5.0,
    "weight": 5.0,
    "walk": 3.5,
    "yoga": 3.0,
}
DEFAULT_MET = 4.0
DEFAULT_WEIGHT_KG = 70.0


def estimate_calories_burned(
    workout_type: str | None,
    duration_min: int | None,
    weight_kg: float | None,
) -> float | None:
    """Estimate kcal burned, or None when duration is missing/zero.

    kcal = MET * 3.5 * weight_kg / 200 * minutes
    """
    if not duration_min or duration_min <= 0:
        return None
    weight = weight_kg if weight_kg and weight_kg > 0 else DEFAULT_WEIGHT_KG
    met = DEFAULT_MET
    if workout_type:
        key = workout_type.strip().lower()
        for needle, value in MET_TABLE.items():
            if needle in key:
                met = value
                break
    return round(met * 3.5 * weight / 200 * duration_min, 1)
