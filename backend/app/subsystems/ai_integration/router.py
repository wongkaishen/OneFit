"""AI & Integration subsystem (SDD §5.1.1) — DEFERRED (future roadmap).

This is the seam where the future AI work plugs in: Groq plan/feedback
generation, Hugging Face inference, and USDA FoodData Central nutrition lookups.
Per the agreed roadmap, the MVP ships the manual equivalents in the Gym User and
Wellness Specialist subsystems; these endpoints are stubs returning 501 so the
contract exists and the frontend can wire to it now.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["ai_integration"])

_NOT_IMPLEMENTED = "AI & Integration subsystem is on the future roadmap; not yet implemented."


class GeneratePlanRequest(BaseModel):
    # All optional: this is a deferred stub, so any (or no) payload must still
    # surface the 501 "AI coming soon" contract rather than a 422 body-validation
    # error raised before the handler runs.
    user_id: str | None = None
    goal: str | None = None


@router.post("/workout-plan", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def generate_workout_plan(_: GeneratePlanRequest | None = None):
    """Future: generate a workout plan via Groq from the user's fitness profile."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/nutrition/search", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def nutrition_search(q: str | None = None):
    """Future: look up macro/micro-nutrients from USDA FoodData Central."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)
