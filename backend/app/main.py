"""OneFit FastAPI backend.

4-tier architecture (SDD §5.1): this is the application tier that mediates all
traffic between the Next.js frontend, Supabase (data/auth), and — in future —
the AI providers. Routers are organised by SDD subsystem.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html

from app.core.config import get_settings
from app.subsystems.admin.router import router as admin_router
from app.subsystems.ai_integration.router import router as ai_router
from app.subsystems.auth.router import router as auth_router
from app.subsystems.gym_user.router import router as gym_router
from app.subsystems.notifications.router import router as notifications_router
from app.subsystems.wellness_specialist.router import router as specialist_router

settings = get_settings()

# Default docs are disabled so we can serve Swagger UI / ReDoc assets from unpkg.
# FastAPI's built-in /docs loads from cdn.jsdelivr.net, which is unreachable on
# some networks (blank page); unpkg is reachable, so we point the assets there.
app = FastAPI(
    title="OneFit API",
    version="0.1.0",
    description="Backend for the OneFit digital wellness platform (SDD v2.0).",
    docs_url=None,
    redoc_url=None,
)

_SWAGGER_JS = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
_SWAGGER_CSS = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
_REDOC_JS = "https://unpkg.com/redoc@next/bundles/redoc.standalone.js"


@app.get("/docs", include_in_schema=False)
async def swagger_ui():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        swagger_js_url=_SWAGGER_JS,
        swagger_css_url=_SWAGGER_CSS,
    )


@app.get("/redoc", include_in_schema=False)
async def redoc_ui():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - ReDoc",
        redoc_js_url=_REDOC_JS,
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
