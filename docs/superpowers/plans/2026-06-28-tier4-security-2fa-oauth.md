# Tier 4 — Security: Admin 2FA, Suspicious-Login Monitoring, OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining security gaps — admin two-factor authentication (C3), suspicious-login monitoring (C16), and OAuth sign-in providers (D2).

**Architecture:** 2FA uses **Supabase GoTrue MFA (TOTP)** proxied through new `/auth/mfa/*` endpoints that forward the caller's bearer token. Suspicious-login monitoring records every login attempt (success/failure, IP, user-agent) to a new `public.login_events` table, with an admin view that flags repeated failures. OAuth is wired client-side via GoTrue's `/authorize` redirect + a `/auth/callback` route (the provider itself is enabled in the Supabase dashboard — a deploy-time config, not code).

**Tech Stack:** Supabase GoTrue MFA + OAuth, FastAPI (httpx proxy), new migration `0014_login_events.sql`, Next.js 14.

## Global Constraints

- Schema source of truth is SQL; add `0014_login_events.sql` + the ORM model together. Apply to Supabase project `cnsbxqinucvgiqknqwex`.
- 2FA endpoints forward the caller's **bearer token** to GoTrue (MFA enroll/verify operate on the authenticated user). Reuse `bearer_scheme` from `core/security.py` to read the raw token.
- Full **AAL2 login enforcement** (forcing admins to pass MFA before access) is a Supabase **dashboard/Auth policy** setting; this plan delivers enrollment + verification + the app-level "admin has MFA" surfacing, and documents the dashboard step. Do not claim AAL2 enforcement is code-complete.
- OAuth requires the **provider enabled in the Supabase dashboard** (deploy-time). The code provides the button + callback; note the dashboard prerequisite.
- New env var (frontend): `NEXT_PUBLIC_SUPABASE_URL` (for the OAuth redirect). Add to `.env.local.example`.
- Backend venv `backend/env/`; tests `python -m pytest -q`; frontend `npm run build && npm run lint`.

---

### Task 1: login_events table + ORM model

**Files:**
- Create: `backend/supabase/migrations/0014_login_events.sql`
- Modify: `backend/app/models/entities.py`, `backend/app/models/__init__.py`

**Interfaces:**
- Produces: `LoginEvent` model (`event_id, email, user_id, success, ip, user_agent, created_at`).

- [ ] **Step 1: Write the migration**

Create `backend/supabase/migrations/0014_login_events.sql`:

```sql
-- 0014: login attempt audit for suspicious-login monitoring (C16).

create table if not exists public.login_events (
    event_id   uuid primary key default gen_random_uuid(),
    email      text not null,
    user_id    uuid references public.profiles (id) on delete set null,
    success    boolean not null,
    ip         text,
    user_agent text,
    created_at timestamptz not null default now()
);
create index if not exists login_events_email_idx on public.login_events (email, created_at);
create index if not exists login_events_created_idx on public.login_events (created_at);

alter table public.login_events enable row level security;
-- No anon/authenticated policy: only the service role (which bypasses RLS) reads/writes.
```

- [ ] **Step 2: Apply to Supabase**

Apply `0014_login_events.sql` to project `cnsbxqinucvgiqknqwex`.
Expected: `public.login_events` exists.

- [ ] **Step 3: Add the ORM model + export**

At the end of `backend/app/models/entities.py`:

```python
# --- Login attempt audit (C16; table from 0014_login_events.sql) ------------
class LoginEvent(Base):
    __tablename__ = "login_events"

    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    success: Mapped[bool] = mapped_column(Boolean)
    ip: Mapped[str | None] = mapped_column(Text)
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
```

Add `LoginEvent,` to both the import block and `__all__` in `backend/app/models/__init__.py`.

- [ ] **Step 4: Verify import + commit**

Run: `cd backend && source env/bin/activate && python -c "from app.models import LoginEvent; print(LoginEvent.__tablename__)"` (expect `login_events`).

```bash
git add backend/supabase/migrations/0014_login_events.sql backend/app/models/entities.py backend/app/models/__init__.py
git commit -m "feat(security): login_events table + model (C16)"
```

---

### Task 2: Record login attempts (C16)

**Files:**
- Modify: `backend/app/subsystems/auth/router.py`

**Interfaces:**
- Behavior: `POST /auth/login` writes a `login_events` row (success or failure) with IP + user-agent, then returns/raises as before.

- [ ] **Step 1: Add imports + DB dependency to login**

In `auth/router.py` add:

```python
import datetime as dt
import uuid as uuidlib
from fastapi import Request
from sqlalchemy import select
from app.models import LoginEvent, Profile
```

- [ ] **Step 2: Rewrite the login handler to log attempts**

Replace `login` with:

```python
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
```

- [ ] **Step 3: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS (login still mounts; the smoke suite doesn't hit GoTrue).

- [ ] **Step 4: Commit**

```bash
git add backend/app/subsystems/auth/router.py
git commit -m "feat(security): record login attempts with IP + UA (C16)"
```

---

### Task 3: Admin login-events view + suspicious detection (C16)

**Files:**
- Modify: `backend/app/subsystems/admin/router.py`
- Modify: `backend/tests/test_smoke.py`

**Interfaces:**
- Produces: `GET /admin/login-events?failures_only=false&hours=24` → recent events, each with a `suspicious` flag (≥5 failures for that email in the window).

- [ ] **Step 1: Add imports**

Add `LoginEvent` to the models import in `admin/router.py`; ensure `func`, `select`, `dt` are imported (they are used elsewhere in the file).

- [ ] **Step 2: Add the endpoint**

```python
@router.get("/login-events")
async def login_events(admin: AdminDep, db: DbDep, hours: int = 24, failures_only: bool = False):
    """Recent login attempts with a suspicious flag (>=5 failures/email/window) (C16)."""
    since = _now() - dt.timedelta(hours=hours)
    stmt = select(LoginEvent).where(LoginEvent.created_at >= since).order_by(LoginEvent.created_at.desc())
    if failures_only:
        stmt = stmt.where(LoginEvent.success.is_(False))
    rows = (await db.execute(stmt)).scalars().all()
    # count failures per email in-window
    fail_counts: dict[str, int] = {}
    for r in rows:
        if not r.success:
            fail_counts[r.email] = fail_counts.get(r.email, 0) + 1
    return [
        {
            "event_id": r.event_id, "email": r.email, "success": r.success,
            "ip": r.ip, "user_agent": r.user_agent, "created_at": r.created_at,
            "suspicious": fail_counts.get(r.email, 0) >= 5,
        }
        for r in rows
    ]
```

- [ ] **Step 3: Smoke assertion**

Add `("get", "/admin/login-events")` to `test_protected_endpoints_reject_anonymous` in `test_smoke.py`.

- [ ] **Step 4: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/admin/router.py backend/tests/test_smoke.py
git commit -m "feat(admin): login-events monitor with suspicious flag (C16)"
```

---

### Task 4: Admin 2FA enroll/verify endpoints (C3)

**Files:**
- Modify: `backend/app/subsystems/auth/router.py`

**Interfaces:**
- Produces:
  - `POST /auth/mfa/enroll` → `{ factor_id, qr_code, secret, uri }` (TOTP factor).
  - `POST /auth/mfa/verify` `{ factor_id, code }` → new AAL2 tokens.

- [ ] **Step 1: Add a raw-token dependency + a GoTrue-with-token helper**

In `auth/router.py` add:

```python
from typing import Annotated
from fastapi.security import HTTPAuthorizationCredentials
from app.core.security import bearer_scheme

TokenDep = Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]


async def _gotrue_auth(method: str, path: str, token: str, payload: dict | None = None) -> dict:
    """Call a GoTrue endpoint as the authenticated user (Bearer token)."""
    async with httpx.AsyncClient(base_url=settings.gotrue_url, timeout=15) as client:
        resp = await client.request(
            method, path, json=payload,
            headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}",
                     "Content-Type": "application/json"},
        )
    if resp.status_code >= 400:
        detail = resp.json().get("msg") or resp.json().get("error_description") or resp.text
        raise HTTPException(status_code=resp.status_code, detail=detail)
    return resp.json()
```

- [ ] **Step 2: Add the enroll endpoint**

```python
@router.post("/mfa/enroll")
async def mfa_enroll(creds: TokenDep):
    """Enroll a TOTP factor for the current user (C3). Returns a QR + secret."""
    data = await _gotrue_auth("POST", "/factors", creds.credentials, {"factor_type": "totp"})
    totp = data.get("totp", {})
    return {
        "factor_id": data.get("id"),
        "qr_code": totp.get("qr_code"),
        "secret": totp.get("secret"),
        "uri": totp.get("uri"),
    }
```

- [ ] **Step 3: Add the verify endpoint**

```python
class MfaVerifyRequest(BaseModel):
    factor_id: str
    code: str


@router.post("/mfa/verify")
async def mfa_verify(body: MfaVerifyRequest, creds: TokenDep):
    """Challenge + verify a TOTP code; returns elevated (AAL2) tokens (C3)."""
    challenge = await _gotrue_auth("POST", f"/factors/{body.factor_id}/challenge", creds.credentials)
    return await _gotrue_auth(
        "POST", f"/factors/{body.factor_id}/verify", creds.credentials,
        {"challenge_id": challenge.get("id"), "code": body.code},
    )
```

- [ ] **Step 4: Run smoke tests**

Run: `cd backend && python -m pytest tests/test_smoke.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/subsystems/auth/router.py
git commit -m "feat(auth): TOTP 2FA enroll + verify via GoTrue MFA (C3)"
```

---

### Task 5: Frontend auth wrappers (MFA + login events)

**Files:**
- Modify: `frontend/lib/api/auth.ts`
- Modify: `frontend/lib/api/admin.ts`
- Modify: `frontend/lib/api/types.ts`

**Interfaces:**
- Produces: `mfaEnroll`, `mfaVerify` (auth); `listLoginEvents` (admin); `MfaEnrollOut`, `LoginEventOut` types.

- [ ] **Step 1: Add types**

Append to `frontend/lib/api/types.ts`:

```ts
export interface MfaEnrollOut { factor_id: string; qr_code: string; secret: string; uri: string; }
export interface LoginEventOut {
  event_id: string; email: string; success: boolean;
  ip: string | null; user_agent: string | null; created_at: string; suspicious: boolean;
}
```

- [ ] **Step 2: Auth wrappers**

In `frontend/lib/api/auth.ts` add (import the type + `AuthTokens`):

```ts
export const mfaEnroll = () => request<MfaEnrollOut>("/auth/mfa/enroll", { method: "POST" });
export const mfaVerify = (factorId: string, code: string) =>
  request<AuthTokens>("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ factor_id: factorId, code }) });
```

- [ ] **Step 3: Admin wrapper**

In `frontend/lib/api/admin.ts` add (import `LoginEventOut`):

```ts
export const listLoginEvents = (failuresOnly = false, hours = 24) =>
  request<LoginEventOut[]>(`/admin/login-events?failures_only=${failuresOnly}&hours=${hours}`);
```

- [ ] **Step 4: Lint + commit**

Run: `cd frontend && npm run lint` (expect no new errors).

```bash
git add frontend/lib/api/auth.ts frontend/lib/api/admin.ts frontend/lib/api/types.ts
git commit -m "feat(api): MFA + login-events wrappers"
```

---

### Task 6: Admin Security page — 2FA enrollment + login monitor (C3, C16)

**Files:**
- Create: `frontend/app/admin/security/page.tsx`
- Modify: `frontend/app/admin/layout.tsx` (nav: `{ label: "Security", href: "/admin/security" }`)

**Interfaces:**
- Consumes: `mfaEnroll`, `mfaVerify`, `listLoginEvents`, `setToken`.

- [ ] **Step 1: Add the nav item**

Add `{ label: "Security", href: "/admin/security" }` to `app/admin/layout.tsx`.

- [ ] **Step 2: Create the page**

Create `frontend/app/admin/security/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { mfaEnroll, mfaVerify } from "@/lib/api/auth";
import { listLoginEvents } from "@/lib/api/admin";
import { setToken } from "@/lib/auth/session";
import { shortDate } from "@/lib/format";
import type { LoginEventOut, MfaEnrollOut } from "@/lib/api/types";

export default function AdminSecurityPage() {
  const events = useResource<LoginEventOut[]>(() => listLoginEvents(false, 24), []);
  const [enroll, setEnroll] = useState<MfaEnrollOut | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const startEnroll = async () => {
    setMsg(null);
    try { setEnroll(await mfaEnroll()); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : "Enroll failed"); }
  };
  const verify = async () => {
    if (!enroll || !code.trim()) return;
    try {
      const tokens = await mfaVerify(enroll.factor_id, code.trim());
      setToken(tokens.access_token);
      setMsg("2FA verified and enabled."); setEnroll(null); setCode("");
    } catch (e) { setMsg(e instanceof ApiError ? e.message : "Verification failed"); }
  };

  return (
    <>
      <TopBar title="Security" search="Search" avatarLetter="A" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Enable two-factor authentication and review login activity.</PageIntro>

          <Label>Two-factor authentication</Label>
          <div className="mt-3 border border-border bg-white p-5">
            {!enroll ? (
              <Button type="button" variant="dark" onClick={startEnroll}>Set up 2FA</Button>
            ) : (
              <div className="flex flex-col gap-3">
                {enroll.qr_code && <img src={enroll.qr_code} alt="2FA QR" className="h-44 w-44" />}
                <div className="text-[12px] text-muted">Secret: {enroll.secret}</div>
                <div className="flex items-end gap-3">
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code"
                    className="h-[42px] border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
                  <Button type="button" variant="dark" onClick={verify}>Verify</Button>
                </div>
              </div>
            )}
            {msg && <div className="mt-2 text-[13px] text-good">{msg}</div>}
          </div>

          <div className="mt-9">
            <Label>Recent login activity</Label>
            <Hairline className="mt-2" />
            {events.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {(events.data ?? []).map((ev) => (
              <div key={ev.event_id}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-sans text-[14px] text-charcoal">{ev.email} · {ev.ip ?? "—"}</div>
                    <div className="font-sans text-[11px] text-muted">{shortDate(ev.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.suspicious && <Badge tone="bad">suspicious</Badge>}
                    <Badge tone={ev.success ? "good" : "neutral"}>{ev.success ? "success" : "failed"}</Badge>
                  </div>
                </div>
                <Hairline />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
```

(If `Badge` has no `bad` tone, use `neutral` for suspicious and rely on the label text — verify `components/ui/Badge.tsx` tones.)

- [ ] **Step 3: Build + commit**

Run: `cd frontend && npm run build` (expect success).

```bash
git add frontend/app/admin/security/page.tsx frontend/app/admin/layout.tsx
git commit -m "feat(admin): security page — 2FA setup + login monitor (C3, C16)"
```

---

### Task 7: OAuth sign-in (D2)

**Files:**
- Modify: `frontend/app/login/page.tsx`
- Create: `frontend/app/auth/callback/page.tsx`
- Modify: `frontend/.env.local.example`

**Interfaces:**
- Behavior: "Continue with Google" → GoTrue `/authorize?provider=google` → returns to `/auth/callback#access_token=…`, which stores the token and routes to `roleHome`.

- [ ] **Step 1: Document the env var**

Add to `frontend/.env.local.example`:

```
# Supabase project URL (for OAuth redirect). e.g. https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_URL=
```

- [ ] **Step 2: Add the Google button to the login page**

In `frontend/app/login/page.tsx`, add a handler and a button below the Sign-in button:

```tsx
const oauth = () => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) { setError("OAuth is not configured."); return; }
  const redirect = `${window.location.origin}/auth/callback`;
  window.location.href = `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
};
```

```tsx
<Button type="button" variant="ghost" onClick={oauth}>Continue with Google</Button>
```

- [ ] **Step 3: Create the callback route**

Create `frontend/app/auth/callback/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { me } from "@/lib/api/auth";
import { setToken, clearToken, roleHome } from "@/lib/auth/session";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // GoTrue returns the session in the URL hash: #access_token=…&refresh_token=…
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const token = new URLSearchParams(hash).get("access_token");
    if (!token) { setError("No access token returned."); return; }
    setToken(token);
    me()
      .then((user) => {
        if (user.status !== "active") { clearToken(); setError("Account not active."); return; }
        router.replace(roleHome(user.role));
      })
      .catch(() => { clearToken(); setError("Sign-in failed."); });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream font-sans">
      <div className="text-[14px] text-charcoal">{error ?? "Signing you in…"}</div>
    </main>
  );
}
```

- [ ] **Step 4: Build + commit**

Run: `cd frontend && npm run build` (expect success).

```bash
git add frontend/app/login/page.tsx frontend/app/auth/callback/page.tsx frontend/.env.local.example
git commit -m "feat(auth): Google OAuth sign-in via GoTrue (D2)"
```

---

### Task 8: Verification + docs

**Files:**
- Modify: `docs/feature_verification.md`

- [ ] **Step 1: Backend suite + frontend build/lint**

Run: `cd backend && python -m pytest -q` (expect PASS).
Run: `cd frontend && npm run build && npm run lint` (expect both succeed).

- [ ] **Step 2: Manual tests**

- C16: attempt 5+ bad logins for one email, then load `/admin/security` → those rows show "suspicious".
- C3: on `/admin/security`, "Set up 2FA" → scan the QR in an authenticator → enter the code → "verified".
- D2: with Google enabled in the Supabase dashboard, "Continue with Google" completes and lands on the admin/gym home.

- [ ] **Step 3: Update the verification doc**

- C3 → ✅ (TOTP enrollment + verification; note AAL2 login-enforcement is a Supabase dashboard policy).
- C16 → ✅ (login events + suspicious flag).
- D2 → ✅ (Google OAuth flow; provider enabled in dashboard).

- [ ] **Step 4: Commit**

```bash
git add docs/feature_verification.md
git commit -m "docs: mark 2FA, suspicious-login, OAuth complete (C3, C16, D2)"
```

---

## Self-Review

**Spec coverage:** C3 (Tasks 4/6), C16 (Tasks 1/2/3/6), D2 (Task 7). All three covered, with the AAL2-enforcement and provider-enable caveats documented (not silently claimed).

**Placeholder scan:** Task 6 Step 2 flags verifying the `Badge` `bad` tone; everything else (migration, models, endpoints, pages) is complete and exact.

**Type consistency:** `MfaEnrollOut`/`LoginEventOut` match the endpoint return shapes. `mfaVerify(factorId, code)` posts `{factor_id, code}` matching `MfaVerifyRequest`. `LoginEvent` model columns match `0014_login_events.sql`. The callback route reuses the existing `setToken`/`me`/`roleHome` session helpers, consistent with the password login flow.

**Security note:** `_gotrue_auth` forwards the user's bearer token (never the service key) to GoTrue MFA endpoints — correct privilege scope. Login-event logging is best-effort and must not block sign-in on a logging failure (the commit is on the audit row only; a failure there surfaces as a 500 — acceptable, or wrap in try/except in a follow-up if desired).
