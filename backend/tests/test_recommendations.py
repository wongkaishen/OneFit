from app.services.recommendations import recommend_from_trends


def test_low_adherence_recommends_scheduling_help():
    rec = recommend_from_trends(40.0, 2000.0, 80.0, 50.0)
    assert "adherence" in rec.lower()


def test_low_activity_consistency_recommends_engagement():
    rec = recommend_from_trends(90.0, 2000.0, 30.0, 50.0)
    assert "activity" in rec.lower() or "engagement" in rec.lower()


def test_healthy_metrics_give_positive_message():
    rec = recommend_from_trends(85.0, 2100.0, 80.0, 70.0)
    assert "on track" in rec.lower() or "healthy" in rec.lower()


def test_handles_missing_metrics():
    rec = recommend_from_trends(None, None, None, None)
    assert isinstance(rec, str) and rec
