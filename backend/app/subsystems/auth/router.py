"""Authentication subsystem (Platform Services).

Implements SDD Gym User UC1 Register / UC2 Login by proxying Supabase GoTrue,
so the Next.js frontend only ever talks to FastAPI. Email verification is
handled by Supabase. The `on_auth_user_created` trigger creates the profile row;
here we also create the gym_users + fitness_profiles rows for new self-signups.
"""

import datetime as dt
import logging
import uuid as uuidlib
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, bearer_scheme, get_current_user
from app.models import LoginEvent, Profile

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
logger = logging.getLogger(__name__)


RegisterRole = Literal["gym_user", "wellness_specialist"]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    role: RegisterRole = "gym_user"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


async def _gotrue(path: str, payload: dict) -> dict:
    """Call a Supabase GoTrue endpoint with the anon key."""
    async with httpx.AsyncClient(base_url=settings.gotrue_url, timeout=15) as client:
        resp = await client.post(
            path,
            json=payload,
            headers={"apikey": settings.supabase_anon_key, "Content-Type": "application/json"},
        )
    if resp.status_code >= 400:
        detail = resp.json().get("msg") or resp.json().get("error_description") or resp.text
        raise HTTPException(status_code=resp.status_code, detail=detail)
    return resp.json()


async def _provision_subtype(db: AsyncSession, user_id: str, role: RegisterRole) -> None:
    """Create the role-specific subtype row(s) for a freshly signed-up user.

    The base profile row is created by the on_auth_user_created trigger; here we
    add the subtype. Best-effort: a failure here must not orphan the already
    created auth user, so we roll back the subtype writes and swallow the error
    (the row can be backfilled) rather than 500 the whole signup.
    """
    try:
        if role == "wellness_specialist":
            # specialization is NOT NULL; seed a placeholder the specialist edits
            # later. approval_status defaults to 'pending'.
            await db.execute(
                text(
                    "insert into public.wellness_specialists (user_id, specialization) "
                    "values (:id, :spec) on conflict do nothing"
                ),
                {"id": user_id, "spec": "General Wellness"},
            )
            # B3: specialists require admin approval before access. The trigger sets
            # 'active'; downgrade to 'pending' so AuthGate blocks them until approved.
            await db.execute(
                text("update public.profiles set status='pending' where id = :id"),
                {"id": user_id},
            )
        else:
            await db.execute(
                text("insert into public.gym_users (user_id) values (:id) on conflict do nothing"),
                {"id": user_id},
            )
            await db.execute(
                text(
                    "insert into public.fitness_profiles (user_id) "
                    "values (:id) on conflict do nothing"
                ),
                {"id": user_id},
            )
        await db.commit()
    except Exception:  # noqa: BLE001 - subtype provisioning is best-effort
        await db.rollback()
        logger.exception("Failed to provision %s subtype for %s", role, user_id)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    """Register a new Gym User or Wellness Specialist (UC1).

    Accounts are active on sign-up (the handle_new_user trigger sets status
    'active') and can use the app immediately once their email is confirmed;
    role-based access still governs what each role sees. 'suspended' remains an
    admin-moderation state. Admins are seeded directly in Supabase and cannot
    self-register. Returns the GoTrue signup result.
    """
    result = await _gotrue(
        "/signup",
        {
            "email": body.email,
            "password": body.password,
            # The on_auth_user_created trigger maps this role into public.profiles.
            "data": {"name": body.name, "role": body.role},
        },
    )
    user = result.get("user") or result
    user_id = user.get("id")
    if user_id:
        await _provision_subtype(db, user_id, body.role)
    return result


@router.post("/login")
async def login(body: LoginRequest, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """Log in with email + password (UC2); records the attempt for monitoring (C16)."""
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    try:
        tokens = await _gotrue("/token?grant_type=password", {"email": body.email, "password": body.password})
    except HTTPException:
        db.add(LoginEvent(event_id=uuidlib.uuid4(), email=body.email, user_id=None,
                          success=False, ip=ip, user_agent=ua,
                          created_at=dt.datetime.now(dt.timezone.utc)))
        await db.commit()
        raise
    # success: resolve the profile id for the audit row
    prof = (await db.execute(select(Profile.id).where(Profile.email == body.email))).scalar_one_or_none()
    db.add(LoginEvent(event_id=uuidlib.uuid4(), email=body.email, user_id=prof,
                      success=True, ip=ip, user_agent=ua,
                      created_at=dt.datetime.now(dt.timezone.utc)))
    await db.commit()
    return tokens


@router.get("/me", response_model=CurrentUser)
async def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Return the authenticated caller's profile."""
    return user
