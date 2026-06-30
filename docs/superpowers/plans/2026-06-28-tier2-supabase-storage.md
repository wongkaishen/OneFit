# Tier 2 — Supabase Storage & File Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Supabase Storage so the schema's existing file columns work end-to-end — progress photo upload (A24), educational media upload (B11), specialist credential upload (B2) — closing D5 (Cloud Storage).

**Architecture:** Uploads are **proxied through FastAPI** (consistent with the rest of the app: the browser never holds the Supabase service key, and auth stays in the existing JWT flow). A new `app/services/storage.py` uploads bytes to Supabase Storage via httpx using the service-role key and builds public/signed URLs. Two buckets: `onefit-public` (public read — progress photos, educational media) and `onefit-credentials` (private — specialist certs, viewed by admins via short-lived signed URLs). The DB columns already exist (`progress_entries.photo_url`, `educational_content.media_url`, `wellness_specialists.certification_doc`), so the only schema change is creating the buckets + storage RLS policies.

**Tech Stack:** FastAPI `UploadFile` (needs `python-multipart`), httpx (already present), Supabase Storage REST API, Next.js multipart upload via `FormData`.

## Global Constraints

- Backend uses the **service-role key** and bypasses storage RLS; the bucket policies are defense-in-depth (mirror `0002_rls.sql` / `0010_meal_plans_rls.sql`).
- Buckets: `onefit-public` (public=true), `onefit-credentials` (public=false). Do not make credentials public.
- Reuse existing columns — **no** new table columns. Schema change is limited to `storage.buckets` + `storage.objects` policies in a new migration `0012_storage.sql`.
- The frontend JSON client (`request<T>`) force-sets `Content-Type: application/json`; multipart uploads MUST use the **separate** `upload<T>` helper added in Task 7 (never reuse `request` for files).
- Backend venv `backend/env/`. Backend tests `python -m pytest -q`. Frontend verify `npm run build && npm run lint`.
- Migrations are applied to Supabase project `cnsbxqinucvgiqknqwex`; this plan's migration must be applied there (via the Supabase MCP `apply_migration` or the SQL editor) before manual upload testing.

---

### Task 1: Add python-multipart dependency

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add the dependency**

Add to `backend/requirements.txt` (under the existing web deps, near `httpx==0.28.1`):

```
python-multipart==0.0.20
```

- [ ] **Step 2: Install it**

Run: `cd backend && source env/bin/activate && pip install python-multipart==0.0.20`
Expected: `Successfully installed python-multipart-0.0.20`

- [ ] **Step 3: Verify import**

Run: `python -c "import multipart; print(multipart.__version__)"`
Expected: prints `0.0.20`

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt
git commit -m "build(backend): add python-multipart for file uploads"
```

---

### Task 2: Storage buckets migration

**Files:**
- Create: `backend/supabase/migrations/0012_storage.sql`

- [ ] **Step 1: Write the migration**

Create `backend/supabase/migrations/0012_storage.sql`:

```sql
-- 0012: Supabase Storage buckets for OneFit uploads.
--
-- Two buckets:
--   onefit-public      public read  -> progress photos, educational media
--   onefit-credentials private      -> specialist certification docs (admin-viewed)
--
-- The FastAPI backend uses the service-role key and bypasses storage RLS; these
-- policies are defense-in-depth for direct anon/authenticated access. Idempotent.

insert into storage.buckets (id, name, public)
values ('onefit-public', 'onefit-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('onefit-credentials', 'onefit-credentials', false)
on conflict (id) do nothing;

-- Public bucket: anyone may read; only the service role writes (default-deny on
-- insert/update/delete for anon+authenticated since no permissive policy grants it).
drop policy if exists "onefit-public read" on storage.objects;
create policy "onefit-public read" on storage.objects for select
    using (bucket_id = 'onefit-public');

-- Credentials bucket: no anon/authenticated select policy => only the service
-- role (which bypasses RLS) can read or write. Nothing to create here.
```

- [ ] **Step 2: Apply the migration to Supabase**

Apply `0012_storage.sql` against project `cnsbxqinucvgiqknqwex` (Supabase MCP `apply_migration` with name `0012_storage`, or paste into the SQL editor).
Expected: buckets `onefit-public` and `onefit-credentials` exist (verify in Storage dashboard or `select id, public from storage.buckets;`).

- [ ] **Step 3: Commit**

```bash
git add backend/supabase/migrations/0012_storage.sql
git commit -m "feat(storage): create onefit-public + onefit-credentials buckets (D5)"
```

---

### Task 3: Storage service + pure path/URL helpers

**Files:**
- Create: `backend/app/services/storage.py`
- Test: `backend/tests/test_storage_paths.py`

**Interfaces:**
- Produces (pure, tested): `safe_object_path(prefix: str, owner_id, filename: str) -> str`, `public_url(bucket: str, path: str) -> str`.
- Produces (network, manual): `async upload_object(bucket, path, content: bytes, content_type: str) -> str`, `async signed_url(bucket, path, expires_in: int = 3600) -> str`.

- [ ] **Step 1: Write the failing test for the pure helpers**

Create `backend/tests/test_storage_paths.py`:

```python
import uuid

from app.services.storage import safe_object_path, public_url


def test_path_keeps_extension_and_namespaces_by_owner():
    owner = uuid.UUID("11111111-1111-1111-1111-111111111111")
    p = safe_object_path("progress", owner, "My Photo.PNG")
    assert p.startswith(f"progress/{owner}/")
    assert p.endswith(".png")


def test_path_defaults_extension_when_missing():
    owner = uuid.uuid4()
    p = safe_object_path("content", owner, "noext")
    assert p.endswith(".bin")


def test_public_url_shape(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    from app.core.config import get_settings
    get_settings.cache_clear()
    url = public_url("onefit-public", "progress/a/b.png")
    assert url == "https://x.supabase.co/storage/v1/object/public/onefit-public/progress/a/b.png"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_storage_paths.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.storage'`

- [ ] **Step 3: Write the implementation**

Create `backend/app/services/storage.py`:

```python
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
    return f"{s.supabase_url.rstrip('/')}/storage/v1{signed}"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_storage_paths.py -q`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/storage.py backend/tests/test_storage_paths.py
git commit -m "feat(storage): supabase storage service + path helpers"
```

---

### Task 4: Gym progress photo upload endpoint (A24)

**Files:**
- Modify: `backend/app/subsystems/gym_user/router.py`
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Produces: `POST /gym/progress/photo` (multipart `file`) → `{ "photo_url": str }`.

- [ ] **Step 1: Add imports**

In `gym_user/router.py` add `UploadFile, File` to the FastAPI import and the storage import:

```python
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from app.services.storage import PUBLIC_BUCKET, public_url, safe_object_path, upload_object
```

- [ ] **Step 2: Add the endpoint after `add_progress`**

```python
@router.post("/progress/photo")
async def upload_progress_photo(user: GymUserDep, db: DbDep, file: UploadFile = File(...)):
    """Upload a progress photo to the public bucket; returns its URL (A24).

    The returned `photo_url` is then sent with POST /gym/progress.
    """
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 5 MB")
    path = safe_object_path("progress", user.id, file.filename or "photo.jpg")
    await upload_object(PUBLIC_BUCKET, path, content, file.content_type or "image/jpeg")
    return {"photo_url": public_url(PUBLIC_BUCKET, path)}
```

- [ ] **Step 3: Extend the smoke OpenAPI assertion**

Add `"/gym/progress/photo"` to the `expected` list in `test_openapi_lists_all_subsystems`.

- [ ] **Step 4: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/gym_user/router.py backend/tests/test_smoke.py
git commit -m "feat(gym): progress photo upload endpoint (A24)"
```

---

### Task 5: Specialist media + credential upload endpoints (B11, B2)

**Files:**
- Modify: `backend/app/subsystems/wellness_specialist/router.py`

**Interfaces:**
- Produces:
  - `POST /specialist/content/media` (multipart `file`) → `{ "media_url": str }`.
  - `POST /specialist/credentials` (multipart `file`) → `{ "stored": true }` (saves path to `wellness_specialists.certification_doc`).

- [ ] **Step 1: Add imports**

In `wellness_specialist/router.py` add `UploadFile, File` to the FastAPI import, `WellnessSpecialist` to the models import, and:

```python
from app.services.storage import (
    CREDENTIALS_BUCKET, PUBLIC_BUCKET, public_url, safe_object_path, upload_object,
)
```

- [ ] **Step 2: Add the media upload endpoint after `create_content`**

```python
@router.post("/content/media")
async def upload_content_media(user: SpecialistDep, db: DbDep, file: UploadFile = File(...)):
    """Upload educational media to the public bucket; returns its URL (B11)."""
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 15 MB")
    path = safe_object_path("content", user.id, file.filename or "media.bin")
    await upload_object(PUBLIC_BUCKET, path, content, file.content_type or "application/octet-stream")
    return {"media_url": public_url(PUBLIC_BUCKET, path)}
```

- [ ] **Step 3: Add the credential upload endpoint**

```python
@router.post("/credentials")
async def upload_credential(user: SpecialistDep, db: DbDep, file: UploadFile = File(...)):
    """Upload a certification doc to the private bucket; store its path (B2)."""
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 15 MB")
    path = safe_object_path("cred", user.id, file.filename or "cert.pdf")
    await upload_object(CREDENTIALS_BUCKET, path, content, file.content_type or "application/pdf")
    spec = await db.get(WellnessSpecialist, uuid.UUID(user.id))
    if spec is not None:
        spec.certification_doc = path  # store the object path, not a public URL
        await db.commit()
    return {"stored": True}
```

- [ ] **Step 4: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/wellness_specialist/router.py
git commit -m "feat(specialist): educational media + credential upload (B11, B2)"
```

---

### Task 6: Admin credential view endpoint (B2)

**Files:**
- Modify: `backend/app/subsystems/admin/router.py`

**Interfaces:**
- Produces: `GET /admin/specialists/{user_id}/credential` → `{ "url": str }` (short-lived signed URL) or 404 if none.

- [ ] **Step 1: Add imports**

Add `WellnessSpecialist` to the models import and:

```python
from app.services.storage import CREDENTIALS_BUCKET, signed_url
```

- [ ] **Step 2: Add the endpoint**

```python
@router.get("/specialists/{user_id}/credential")
async def get_specialist_credential(user_id: uuid.UUID, admin: AdminDep, db: DbDep):
    """Short-lived signed URL to a specialist's uploaded credential (B2)."""
    spec = await db.get(WellnessSpecialist, user_id)
    if spec is None or not spec.certification_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No credential on file")
    return {"url": await signed_url(CREDENTIALS_BUCKET, spec.certification_doc)}
```

- [ ] **Step 3: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/admin/router.py
git commit -m "feat(admin): signed-URL view of specialist credential (B2)"
```

---

### Task 7: Frontend multipart upload helper

**Files:**
- Modify: `frontend/lib/api/client.ts`

**Interfaces:**
- Produces: `export async function upload<T>(path: string, file: File, field = "file"): Promise<T>`.

- [ ] **Step 1: Add the helper at the end of `client.ts`**

```ts
export async function upload<T>(path: string, file: File, field = "file"): Promise<T> {
  const headers = new Headers();
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  // NOTE: do NOT set Content-Type — the browser sets the multipart boundary.
  const form = new FormData();
  form.append(field, file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form, headers, cache: "no-store" });
  if (!res.ok) {
    let msg: string = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch { /* non-JSON */ }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}
```

Note: `token` is module-private; the helper lives in the same file so it can call it.

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api/client.ts
git commit -m "feat(api): multipart upload helper"
```

---

### Task 8: Frontend upload wrappers

**Files:**
- Modify: `frontend/lib/api/gym.ts`, `frontend/lib/api/specialist.ts`, `frontend/lib/api/admin.ts`

- [ ] **Step 1: Gym wrapper**

In `frontend/lib/api/gym.ts` add (import `upload` alongside `request`):

```ts
import { request, upload } from "./client";
export const uploadProgressPhoto = (file: File) =>
  upload<{ photo_url: string }>("/gym/progress/photo", file);
```

- [ ] **Step 2: Specialist wrappers**

In `frontend/lib/api/specialist.ts` (import `upload`):

```ts
export const uploadContentMedia = (file: File) =>
  upload<{ media_url: string }>("/specialist/content/media", file);
export const uploadCredential = (file: File) =>
  upload<{ stored: boolean }>("/specialist/credentials", file);
```

- [ ] **Step 3: Admin wrapper**

In `frontend/lib/api/admin.ts`:

```ts
export const getSpecialistCredential = (id: string) =>
  request<{ url: string }>(`/admin/specialists/${id}/credential`);
```

- [ ] **Step 4: Lint + commit**

Run: `cd frontend && npm run lint` (expect no new errors).

```bash
git add frontend/lib/api/gym.ts frontend/lib/api/specialist.ts frontend/lib/api/admin.ts
git commit -m "feat(api): upload wrappers for photo, media, credential"
```

---

### Task 9: Progress page — photo upload UI (A24)

**Files:**
- Modify: `frontend/app/gym/progress/page.tsx`

**Interfaces:**
- Consumes: `uploadProgressPhoto`; existing `addProgress` already accepts `photo_url`.

- [ ] **Step 1: Read the progress page form area**

Run: `grep -n "addProgress\|photo\|weight\|onSubmit\|useState" frontend/app/gym/progress/page.tsx`

- [ ] **Step 2: Add file state + upload-then-attach**

In the component add:

```ts
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { photo_url } = await uploadProgressPhoto(file);
      setPhotoUrl(photo_url);
    } catch {
      /* surface via existing error state if present */
    } finally {
      setUploading(false);
    }
  };
```

Import `uploadProgressPhoto` from `@/lib/api/gym`. In the progress submit handler, include `photo_url: photoUrl ?? undefined` in the `addProgress({...})` body, and reset `setPhotoUrl(null)` after success.

- [ ] **Step 3: Add the file input + preview to the form**

```tsx
<div className="flex flex-col gap-2">
  <Label>Progress photo (optional)</Label>
  <input type="file" accept="image/*" onChange={onPickPhoto} className="text-[13px]" />
  {uploading && <Label>Uploading…</Label>}
  {photoUrl && <img src={photoUrl} alt="progress" className="mt-2 h-24 w-24 object-cover" />}
</div>
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/gym/progress/page.tsx
git commit -m "feat(gym): progress photo upload UI (A24)"
```

---

### Task 10: Content page — media upload UI (B11)

**Files:**
- Modify: `frontend/app/specialist/content/page.tsx`

**Interfaces:**
- Consumes: `uploadContentMedia`; `createContent` already accepts `media_url`.

- [ ] **Step 1: Read the content create form**

Run: `grep -n "createContent\|media_url\|useState\|onSubmit" frontend/app/specialist/content/page.tsx`

- [ ] **Step 2: Add media file state + handler**

```ts
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const onPickMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const { media_url } = await uploadContentMedia(file); setMediaUrl(media_url); } catch { /* */ }
  };
```

Import `uploadContentMedia` from `@/lib/api/specialist`. Include `media_url: mediaUrl ?? undefined` in the `createContent({...})` body; reset after success.

- [ ] **Step 3: Add the file input to the create form**

```tsx
<div className="flex flex-col gap-2">
  <Label>Media (optional)</Label>
  <input type="file" onChange={onPickMedia} className="text-[13px]" />
  {mediaUrl && <div className="text-[12px] text-good">Media attached.</div>}
</div>
```

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/specialist/content/page.tsx
git commit -m "feat(specialist): educational media upload UI (B11)"
```

---

### Task 11: Credential upload UI + admin view + verification

**Files:**
- Modify: `frontend/app/specialist/content/page.tsx` (add a credential upload control — specialists have no profile page)
- Modify: `frontend/app/admin/registrations/page.tsx` (from Plan 2 — add a "View credential" action)
- Modify: `docs/feature_verification.md`

**Interfaces:**
- Consumes: `uploadCredential` (specialist), `getSpecialistCredential` (admin).

- [ ] **Step 1: Add a credential upload control to the content page header**

Near the top of the content page, add a small section:

```tsx
<div className="mb-6 border border-border bg-white p-4">
  <Label>Upload your certification (admin reviews this for approval)</Label>
  <input type="file" accept=".pdf,image/*" className="mt-2 text-[13px]"
    onChange={async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      try { await uploadCredential(f); alert("Credential uploaded."); } catch { alert("Upload failed."); }
    }} />
</div>
```

Import `uploadCredential` from `@/lib/api/specialist`.

- [ ] **Step 2: Add "View credential" to the admin registrations rows**

In `frontend/app/admin/registrations/page.tsx`, for rows where `u.role === "wellness_specialist"`, add a button:

```tsx
{u.role === "wellness_specialist" && (
  <Button type="button" variant="ghost" onClick={async () => {
    try { const { url } = await getSpecialistCredential(u.user_id); window.open(url, "_blank"); }
    catch { alert("No credential on file."); }
  }}>View credential</Button>
)}
```

Import `getSpecialistCredential` from `@/lib/api/admin`.

- [ ] **Step 3: Apply migration (if not already) + manual upload smoke test**

Confirm `0012_storage.sql` is applied. With backend + frontend running and a real Supabase: upload a progress photo, an educational media file, and a specialist credential; confirm the photo renders, and that an admin can open the credential signed URL.

- [ ] **Step 4: Run backend tests + frontend build/lint**

Run: `cd backend && python -m pytest -q` (expect PASS).
Run: `cd frontend && npm run build && npm run lint` (expect both succeed).

- [ ] **Step 5: Update the verification doc**

Flip A24, B2, B11, and D5 to ✅ with the new storage evidence.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/specialist/content/page.tsx frontend/app/admin/registrations/page.tsx docs/feature_verification.md
git commit -m "feat(storage): credential upload + admin view; mark A24,B2,B11,D5 done"
```

---

## Self-Review

**Spec coverage:** A24 (Task 4/9), B11 (Task 5/10), B2 (Task 5/6/11), D5 (Task 2/3, the whole storage layer). All Tier-2 storage items covered.

**Placeholder scan:** Frontend Tasks 9/10/11 require reading the existing page first (their Step 1) to bind the submit-handler variable names; all backend code, the migration, the storage service, and the `upload` helper are complete and exact.

**Type consistency:** `upload<T>` returns the typed JSON; wrappers declare `{ photo_url }`, `{ media_url }`, `{ stored }`, `{ url }` matching the backend return dicts. `safe_object_path`/`public_url`/`upload_object`/`signed_url` signatures match all call sites. `certification_doc` stores the object **path** (not a URL); the admin endpoint signs that path — consistent between Task 5 and Task 6.

**Dependency note:** Task 1 (python-multipart) must land before Tasks 4/5 or FastAPI raises `Form data requires "python-multipart"` at import of the upload routes.
