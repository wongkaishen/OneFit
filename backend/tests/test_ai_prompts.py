from app.services.ai import build_plan_messages


def test_plan_messages_include_goal_and_profile():
    msgs = build_plan_messages("Build strength", {"age": 30, "weight": 70})
    assert msgs[0]["role"] == "system"
    joined = " ".join(m["content"] for m in msgs)
    assert "Build strength" in joined
    assert "json" in joined.lower()  # JSON mode requires the word "json" in the prompt
