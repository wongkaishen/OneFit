"""Supabase Storage access (Platform Services, D5).

Uploads are proxied through the backend using the service-role key. Pure helpers
(path building, public URL) are unit-tested; the httpx calls are exercised manually
against a real project.
"""

import os
import uuid

import httpx

from app.core.config import get_settings

PUBLIC_BUCKET = "onefit-public"
CREDENTIALS_BUCKET = "onefit-credentials"


def safe_object_path(prefix: str, owner_id, filename: str) -> str:
    """`{prefix}/{owner}/{uuid}.{ext}` — never trusts the client filename body."""
    ext = ""
    if "." in filename:
        ext = filename.rsplit(".", 1)[1].lower()
    ext = "".join(c for c in ext if c.isalnum()) or "bin"
    return f"{prefix}/{owner_id}/{uuid.uuid4()}.{ext}"


def public_url(bucket: str, path: str) -> str:
    base = (get_settings().supabase_url if "SUPABASE_URL" not in os.environ
            else os.environ["SUPABASE_URL"]).rstrip("/")
    return f"{base}/storage/v1/object/public/{bucket}/{path}"


def _headers(content_type: str | None = None) -> dict:
    s = get_settings()
    h = {
        "Authorization": f"Bearer {s.supabase_service_role_key}",
        "apikey": s.supabase_service_role_key,
    }
    if content_type:
        h["Content-Type"] = content_type
    return h


async def upload_object(bucket: str, path: str, content: bytes, content_type: str) -> str:
    """Upload bytes; return the path stored (caller derives a public/signed URL)."""
    s = get_settings()
    url = f"{s.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{path}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url, content=content, headers={**_headers(content_type), "x-upsert": "true"}
        )
    if resp.status_code >= 400:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {resp.text}")
    return path


async def signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    """Create a short-lived signed URL for a private object."""
    s = get_settings()
    url = f"{s.supabase_url.rstrip('/')}/storage/v1/object/sign/{bucket}/{path}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json={"expiresIn": expires_in}, headers=_headers("application/json"))
    if resp.status_code >= 400:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"Storage sign failed: {resp.text}")
    signed = resp.json().get("signedURL", "")
    base = s.supabase_url.rstrip("/")
    # signedURL is normally returned as "/object/sign/{bucket}/{path}?token=..."
    # (no /storage/v1 prefix). Guard against a doubled prefix if that ever changes.
    if signed.startswith("/storage/v1"):
        return f"{base}{signed}"
    return f"{base}/storage/v1{signed}"
