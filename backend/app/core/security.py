from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=True)


class CurrentUser(BaseModel):
    """Authenticated principal, resolved from the Supabase JWT + profiles row."""

    id: str
    email: str | None = None
    role: str
    status: str


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:  # invalid / expired / wrong audience
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    """Verify the Supabase access token and load the caller's profile."""
    payload = _decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    row = (
        await db.execute(
            text("select id, email, role, status from public.profiles where id = :id"),
            {"id": user_id},
        )
    ).mappings().first()

    if row is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No profile for this user")

    return CurrentUser(id=str(row["id"]), email=row["email"], role=row["role"], status=row["status"])


def require_role(*roles: str):
    """Dependency factory enforcing one of the given roles (SDD role-based access)."""

    async def _guard(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(roles)}",
            )
        return user

    return _guard


# Convenience role guards mirroring the three SDD actors.
require_gym_user = require_role("gym_user")
require_specialist = require_role("wellness_specialist")
require_admin = require_role("admin")
