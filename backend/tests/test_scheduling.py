import datetime as dt

from app.services.scheduling import suggest_alternative_slot


def test_suggests_next_half_hour_when_requested_is_taken():
    booked = {dt.time(9, 0)}
    assert suggest_alternative_slot(dt.time(9, 0), booked) == dt.time(9, 30)


def test_skips_consecutive_booked_slots():
    booked = {dt.time(9, 0), dt.time(9, 30), dt.time(10, 0)}
    assert suggest_alternative_slot(dt.time(9, 0), booked) == dt.time(10, 30)


def test_returns_none_when_no_slot_found():
    # every half-hour slot booked -> nothing free
    booked = {dt.time(h, m) for h in range(24) for m in (0, 30)}
    assert suggest_alternative_slot(dt.time(9, 0), booked) is None
