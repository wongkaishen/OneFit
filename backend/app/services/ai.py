"""OpenAI-backed AI features (SDD §5.1.1).

A thin async wrapper over the OpenAI chat-completions JSON mode. When no API key
is configured, callers get AIDisabledError, which the /ai router maps to HTTP 501
so the "AI coming soon" contract still holds. Prompt builders are pure + tested;
the network calls are exercised manually with a real key.
"""

import json

from app.core.config import get_settings


class AIDisabledError(RuntimeError):
    """Raised when OPENAI_API_KEY is not configured."""


def _client():
    s = get_settings()
    if not s.ai_enabled:
        raise AIDisabledError("OPENAI_API_KEY is not configured")
    from openai import AsyncOpenAI
    return AsyncOpenAI(api_key=s.openai_api_key)


def build_plan_messages(goal: str, profile: dict) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are a certified fitness coach. Produce a safe, progressive "
                "weekly workout plan as JSON with this exact shape: "
                '{"goal": str, "days": [{"day": str, "focus": str, '
                '"exercises": [{"name": str, "sets": int, "reps": int, '
                '"rest_seconds": int, "notes": str}]}]}. Return only JSON.'
            ),
        },
        {
            "role": "user",
            "content": f"Goal: {goal}. Athlete profile (JSON): {json.dumps(profile)}.",
        },
    ]


async def _json_chat(messages: list[dict]) -> dict:
    client = _client()
    model = get_settings().openai_model
    resp = await client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.4,
    )
    return json.loads(resp.choices[0].message.content or "{}")


async def generate_workout_plan(goal: str, profile: dict) -> dict:
    return await _json_chat(build_plan_messages(goal, profile))


async def search_nutrition(query: str) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a nutrition database. For the food described, return JSON "
                '{"food": str, "serving": str, "calories": number, "protein_g": number, '
                '"carbs_g": number, "fat_g": number}. Estimate a typical serving. '
                "Return only JSON."
            ),
        },
        {"role": "user", "content": f"Food: {query}"},
    ]
    return await _json_chat(messages)


async def summarize_feedback(notes: str, context: str) -> str:
    client = _client()
    model = get_settings().openai_model
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a wellness specialist drafting concise, encouraging, professional feedback for a client. 2-4 sentences."},
            {"role": "user", "content": f"Client context: {context}\n\nSpecialist rough notes: {notes}\n\nWrite the polished feedback message."},
        ],
        temperature=0.6,
    )
    return resp.choices[0].message.content or ""


async def recalculate_targets(profile: dict, recent: dict) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a fitness coach. Given the athlete profile and recent "
                "progress, return updated daily targets as JSON "
                '{"calories": number, "protein_g": number, "carbs_g": number, '
                '"fat_g": number, "weekly_sessions": int, "rationale": str}. '
                "Return only JSON."
            ),
        },
        {"role": "user", "content": f"Profile: {json.dumps(profile)}\nRecent: {json.dumps(recent)}"},
    ]
    return await _json_chat(messages)
