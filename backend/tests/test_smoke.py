"""Smoke tests that don't require a live database.

They exercise routing, auth guards, and the deferred-AI contract. Endpoints that
read/write the DB are covered later (integration tests against a real Supabase).
"""

import pytest


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_openapi_lists_all_subsystems(client):
    paths = client.get("/openapi.json").json()["paths"]
    for expected in ["/auth/register", "/gym/profile", "/specialist/feedback",
                     "/admin/users", "/ai/workout-plan", "/gym/plans/{plan_id}"]:
        assert expected in paths


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/auth/me"),
        ("get", "/gym/profile"),
        ("get", "/gym/dashboard"),
        ("get", "/gym/progress"),
        ("get", "/gym/milestones"),
        ("get", "/gym/sessions"),
        ("get", "/specialist/content"),
        ("get", "/admin/users"),
        ("get", "/notifications"),
    ],
)
def test_protected_endpoints_reject_anonymous(client, method, path):
    # HTTPBearer(auto_error=True) rejects missing credentials before any DB access.
    resp = getattr(client, method)(path)
    assert resp.status_code in (401, 403)


def test_ai_workout_plan_is_deferred(client):
    # AI subsystem is on the future roadmap -> 501, no auth/DB needed.
    resp = client.post("/ai/workout-plan", json={"user_id": "x", "goal": "muscle"})
    assert resp.status_code == 501


def test_ai_nutrition_search_is_deferred(client):
    resp = client.get("/ai/nutrition/search", params={"q": "banana"})
    assert resp.status_code == 501
