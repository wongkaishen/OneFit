"""Workout-slot conflict resolution (Gym User A31).

When a requested session time clashes, propose the next free half-hour slot the
same day. Pure function — the router supplies the set of already-booked times.
"""

import datetime as dt


def suggest_alternative_slot(
    requested: dt.time,
    booked: set[dt.time],
    step_min: int = 30,
    max_tries: int = 48,
) -> dt.time | None:
    """Next time after `requested` (in `step_min` increments) not in `booked`."""
    candidate = requested
    base = dt.date.min
    for _ in range(max_tries):
        candidate = (
            dt.datetime.combine(base, candidate) + dt.timedelta(minutes=step_min)
        ).time()
        if candidate not in booked:
            return candidate
    return None
