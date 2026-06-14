"""Authentication subsystem (Platform Services).

Implements SDD Gym User UC1 Register / UC2 Login by proxying Supabase GoTrue,
so the Next.js frontend only ever talks to FastAPI. Email verification is
handled by Supabase. The `on_auth_user_created` trigger creates the profile row;
here we also create the gym_users + fitness_profiles rows for new self-signups.
"""

from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


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


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    """Register a new Gym User (UC1). Returns the GoTrue signup result."""
    result = await _gotrue(
        "/signup",
        {
            "email": body.email,
            "password": body.password,
            "data": {"name": body.name, "role": "gym_user"},
        },
    )
    user = result.get("user") or result
    user_id = user.get("id")
    if user_id:
        # Profile row is created by the DB trigger; provision the gym-user subtype.
        await db.execute(
            text(
                "insert into public.gym_users (user_id) values (:id) on conflict do nothing"
            ),
            {"id": user_id},
        )
        await db.execute(
            text(
                "insert into public.fitness_profiles (user_id) values (:id) on conflict do nothing"
            ),
            {"id": user_id},
        )
        await db.commit()
    return result


@router.post("/login")
async def login(body: LoginRequest):
    """Log in with email + password (UC2). Returns access/refresh tokens."""
    return await _gotrue(
        "/token?grant_type=password",
        {"email": body.email, "password": body.password},
    )


@router.get("/me", response_model=CurrentUser)
async def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Return the authenticated caller's profile."""
    return user
