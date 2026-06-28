from app.services.calories import estimate_calories_burned


def test_running_uses_higher_met():
    # MET 9.8 * 3.5 * 70kg / 200 * 30min = 360.2
    assert estimate_calories_burned("Running", 30, 70) == 360.2


def test_yoga_uses_lower_met():
    # MET 3.0 * 3.5 * 60kg / 200 * 60min = 189.0
    assert estimate_calories_burned("yoga", 60, 60) == 189.0


def test_unknown_type_uses_default_met():
    # default MET 4.0 * 3.5 * 70 / 200 * 30 = 147.0
    assert estimate_calories_burned("underwater basket weaving", 30, 70) == 147.0


def test_missing_weight_defaults_to_70kg():
    assert estimate_calories_burned("Running", 30, None) == 360.2


def test_no_duration_returns_none():
    assert estimate_calories_burned("Running", None, 70) is None
    assert estimate_calories_burned("Running", 0, 70) is None
