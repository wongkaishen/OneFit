"""OneFit FastAPI backend.

4-tier architecture (SDD §5.1): this is the application tier that mediates all
traffic between the Next.js frontend, Supabase (data/auth), and — in future —
the AI providers. Routers are organised by SDD subsystem.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.subsystems.admin.router import router as admin_router
from app.subsystems.ai_integration.router import router as ai_router
from app.subsystems.auth.router import router as auth_router
from app.subsystems.gym_user.router import router as gym_router
from app.subsystems.notifications.router import router as notifications_router
from app.subsystems.wellness_specialist.router import router as specialist_router

settings = get_settings()

app = FastAPI(
    title="OneFit API",
    version="0.1.0",
    description="Backend for the OneFit digital wellness platform (SDD v2.0).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}


# Platform Services
app.include_router(auth_router)
app.include_router(notifications_router)
# Feature subsystems
app.include_router(gym_router)
app.include_router(specialist_router)
app.include_router(admin_router)
# AI & Integration (deferred / future roadmap)
app.include_router(ai_router)
