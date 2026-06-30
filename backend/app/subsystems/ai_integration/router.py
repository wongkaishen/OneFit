"""AI & Integration subsystem (SDD §5.1.1) — OpenAI-backed.

These endpoints call OpenAI when OPENAI_API_KEY is configured; otherwise they
return 501 so the frontend's "AI coming soon" contract still holds.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import CurrentUser, get_current_user
from app.services.ai import (
    AIDisabledError,
    generate_workout_plan,
    recalculate_targets,
    search_nutrition,
    summarize_feedback,
)

router = APIRouter(prefix="/ai", tags=["ai_integration"])

UserDep = Annotated[CurrentUser, Depends(get_current_user)]
_DEFERRED = "AI & Integration subsystem is not configured (no OPENAI_API_KEY); not yet available."


def _deferred() -> HTTPException:
    return HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_DEFERRED)


class GeneratePlanRequest(BaseModel):
    user_id: str | None = None
    goal: str | None = None


class FeedbackSummaryRequest(BaseModel):
    notes: str
    context: str = ""


class RecalcRequest(BaseModel):
    profile: dict[str, Any] = {}
    recent: dict[str, Any] = {}


@router.post("/workout-plan", status_code=status.HTTP_200_OK)
async def workout_plan(body: GeneratePlanRequest, user: UserDep):
    try:
        return await generate_workout_plan(body.goal or "general fitness", {"user_id": user.id})
    except AIDisabledError:
        raise _deferred()


@router.get("/nutrition/search", status_code=status.HTTP_200_OK)
async def nutrition(q: str, user: UserDep):
    try:
        return await search_nutrition(q)
    except AIDisabledError:
        raise _deferred()


@router.post("/feedback-summary")
async def feedback_summary(body: FeedbackSummaryRequest, user: UserDep):
    try:
        return {"summary": await summarize_feedback(body.notes, body.context)}
    except AIDisabledError:
        raise _deferred()


@router.post("/recalculate-targets")
async def recalc(body: RecalcRequest, user: UserDep):
    try:
        return await recalculate_targets(body.profile, body.recent)
    except AIDisabledError:
        raise _deferred()
