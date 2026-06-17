import ssl
from functools import lru_cache
from typing import Annotated

import certifi
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
    user_id: str
    name: str | None = None
    email: str | None = None
    role: str
    status: str


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    """Cached JWKS client pointed at this project's GoTrue.

    PyJWKClient fetches over urllib, which on some platforms (notably macOS
    Python builds) has no usable system CA bundle and fails Supabase's TLS cert
    with CERTIFICATE_VERIFY_FAILED. Pin an SSL context to certifi's bundle so
    asymmetric (ES256/RS256) token verification works everywhere.
    """
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    return jwt.PyJWKClient(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
        cache_keys=True,
        ssl_context=ssl_context,
    )


def _decode_token(token: str) -> dict:
    """Verify a Supabase access token.

    Supabase issues tokens via two mechanisms: legacy projects sign with the
    static HS256 `JWT Secret`; newer projects sign with asymmetric keys
    (ES256/RS256) and publish the public keys via JWKS. The presence of a
    `kid` in the header selects the path.
    """
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token",
        ) from exc

    kid = header.get("kid")
    alg = header.get("alg", "HS256")

    try:
        if kid and alg != "HS256":
            signing_key = _jwks_client().get_signing_key_from_jwt(token).key
            return jwt.decode(
                token,
                signing_key,
                algorithms=[alg],
                audience="authenticated",
            )
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="HS256 token rejected: no SUPABASE_JWT_SECRET configured",
            )
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
            text("select id, name, email, role, status from public.profiles where id = :id"),
            {"id": user_id},
        )
    ).mappings().first()

    if row is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No profile for this user")

    rid = str(row["id"])
    return CurrentUser(
        id=rid,
        user_id=rid,
        name=row["name"],
        email=row["email"],
        role=row["role"],
        status=row["status"],
    )


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
