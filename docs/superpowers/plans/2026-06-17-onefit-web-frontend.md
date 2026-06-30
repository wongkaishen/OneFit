# OneFit Web Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the OneFit Wellness Specialist + Admin web surfaces as a Next.js 14 app in `/frontend`, wired to the existing FastAPI/Supabase backend.

**Architecture:** Next.js App Router with route groups giving Specialist and Admin separate persistent shells. A thin `lib/api` layer attaches a dev Supabase JWT and maps the 501 contract. Screens are client components that load live data via a `useResource` hook. Styling is Tailwind with a theme ported from the OneFit design tokens; EB Garamond is reserved for names/greetings/numerals, coral for CTAs + active markers.

**Tech Stack:** Next.js 14, TypeScript, React 18, Tailwind CSS, `next/font` (Inter + EB Garamond). Backend touch: FastAPI route restore (Python).

**Spec:** `docs/superpowers/specs/2026-06-17-onefit-web-frontend-design.md`

**Repo conventions (MUST follow):**
- **No automated frontend tests.** Verify frontend with `npm run build` (also generates the SW) + `npm run lint` + manual click-through. Do NOT add jest/vitest/RTL.
- All HTTP goes through `lib/api/client.ts`; **501 → "Not implemented yet"**.
- Schema lives in SQL — do not add `create_all`/Alembic. The backend task only moves existing route code; `meal_plans` already exists (migration `0004`).
- End every commit message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File structure

```
frontend/
  package.json, tsconfig.json, next.config.mjs, postcss.config.mjs, tailwind.config.ts
  .env.local.example, .eslintrc.json
  app/
    globals.css                      # @tailwind + token CSS vars
    layout.tsx                       # fonts + <body>
    page.tsx                         # redirect → /specialist/clients
    specialist/
      layout.tsx                     # Sidebar (specialist nav, coral accent)
      clients/page.tsx               # ClientList
      clients/[id]/page.tsx          # ClientDetail + Feedback module
      plans/new/page.tsx             # CreateMealPlan
      content/page.tsx               # Content
      reports/page.tsx               # Reports / Health Trends
    admin/
      layout.tsx                     # Sidebar (admin nav, charcoal accent)
      dashboard/page.tsx             # AdminDashboard
      users/page.tsx                 # UserManagement
      announcements/page.tsx         # Announcements
  components/
    shell/Sidebar.tsx, TopBar.tsx, Avatar.tsx
    ui/Button.tsx, Chip.tsx, Badge.tsx, Progress.tsx, BarChart.tsx, Label.tsx, Hairline.tsx
  lib/
    api/client.ts, useResource.ts, types.ts, specialist.ts, admin.ts
    format.ts                        # relativeTime, etc.
```

Backend (one file): `backend/app/subsystems/wellness_specialist/router.py` (restore routes), delete the orphaned `router.py 19-23-50-863.py`.

---

## Task 1: Scaffold Next.js + Tailwind + tokens + fonts

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/next.config.mjs`, `frontend/postcss.config.mjs`, `frontend/tailwind.config.ts`, `frontend/.eslintrc.json`, `frontend/.env.local.example`
- Create: `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/app/page.tsx`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "onefit-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/node": "20.14.10",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "autoprefixer": "10.4.19",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.5",
    "postcss": "8.4.39",
    "tailwindcss": "3.4.6",
    "typescript": "5.5.3"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create config files**

`frontend/next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```

`frontend/postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`frontend/.eslintrc.json`:
```json
{ "extends": "next/core-web-vitals" }
```

`frontend/.env.local.example`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
# Paste a Supabase access token (specialist or admin) to test against the live backend:
NEXT_PUBLIC_DEV_JWT=
```

- [ ] **Step 4: Create `frontend/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6F0",
        charcoal: "#1F1D1B",
        "charcoal-deep": "#2D2A26",
        "warm-red": "#B94838",
        coral: "#E85D4A",
        muted: "#8A857D",
        subtle: "#5C5852",
        border: "#D8D0C2",
        good: "#1F8A5B",
        "good-border": "#BFE0CC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-garamond)", "Georgia", "serif"],
      },
      letterSpacing: { label: "1.5px", button: "2px" },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create `frontend/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
  /* raw tokens for places where utilities are awkward */
  --cream: #FAF6F0;
  --charcoal: #1F1D1B;
  --muted: #8A857D;
  --subtle: #5C5852;
  --border: #D8D0C2;
  --coral: #E85D4A;
}

html, body { padding: 0; margin: 0; }
body { background: var(--cream); color: var(--charcoal); }
* { box-sizing: border-box; }
```

- [ ] **Step 6: Create `frontend/app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneFit",
  description: "OneFit — Wellness Specialist & Admin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${garamond.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create `frontend/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/specialist/clients");
}
```

- [ ] **Step 8: Install deps and verify build**

Run:
```bash
cd frontend && npm install && npm run build
```
Expected: build completes. The `/` route will redirect; specialist/admin routes don't exist yet so build only compiles `app/page.tsx` + layout (this is fine — pages are added in later tasks). If build complains about missing pages it will not — App Router only builds existing routes.

- [ ] **Step 9: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json \
  frontend/next.config.mjs frontend/postcss.config.mjs frontend/tailwind.config.ts \
  frontend/.eslintrc.json frontend/.env.local.example frontend/app
git commit -m "$(printf 'feat(web): scaffold Next.js app with Tailwind tokens and fonts\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 2: API layer (client, types, resource hook, wrappers)

**Files:**
- Create: `frontend/lib/api/client.ts`, `frontend/lib/api/types.ts`, `frontend/lib/api/useResource.ts`, `frontend/lib/api/specialist.ts`, `frontend/lib/api/admin.ts`, `frontend/lib/format.ts`

- [ ] **Step 1: Create `frontend/lib/api/client.ts`**

```ts
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function token(): string | null {
  if (typeof window !== "undefined") {
    const ls = window.localStorage.getItem("onefit-jwt");
    if (ls) return ls;
  }
  return process.env.NEXT_PUBLIC_DEV_JWT ?? null;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });

  if (res.status === 501) throw new ApiError(501, "Not implemented yet");
  if (!res.ok) {
    let msg: string = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

- [ ] **Step 2: Create `frontend/lib/api/types.ts`** (mirrors backend Pydantic models)

```ts
export interface ClientSummary {
  user_id: string;
  name: string | null;
  email: string;
  goal: string | null;
  weight: number | null;
  body_fat_percent: number | null;
  last_active_at: string | null;
}

export interface ActivityLog {
  log_id: string;
  user_id: string;
  activity_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  intensity: string | null;
  log_date: string;
}

export interface DietaryLog {
  log_id: string;
  user_id: string;
  meal_type: string | null;
  food_item: string | null;
  calories: number | null;
  log_date: string;
}

export interface ProgressEntry {
  entry_id: string;
  user_id: string;
  weight: number | null;
  body_fat_percent: number | null;
  recorded_at: string;
}

export interface MealPlanOut {
  plan_id: string;
  specialist_id: string;
  client_id: string | null;
  name: string;
  goal: string;
  days_per_week: number;
  payload: unknown;
  created_at: string;
}

export interface MealPlanIn {
  name: string;
  goal?: string;
  days_per_week?: number;
  payload?: unknown;
  client_id?: string | null;
}

export interface ContentOut {
  content_id: string;
  specialist_id: string;
  title: string;
  body: string;
  category: string;
  media_url: string | null;
  status: string;
  visibility: boolean;
  created_at: string;
}

export interface ContentIn {
  title: string;
  body: string;
  category: string;
  media_url?: string | null;
  permission_confirmed?: boolean;
}

export interface FeedbackIn {
  user_id: string;
  notes: string;
  plan_updated?: boolean;
}

export interface UserOut {
  user_id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_gym_users: number;
  total_specialists: number;
  total_admins: number;
  pending_approvals: number;
  active_today: number;
}

export interface AuditEntry {
  log_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export interface AnnouncementOut {
  announcement_id: string;
  admin_id: string;
  title: string;
  body: string;
  target_audience: string;
  status: string;
  sent_at: string | null;
}

export interface AnnouncementIn {
  title: string;
  body: string;
  target_audience: string;
}
```

> NOTE on `ActivityLog`/`DietaryLog`/`ProgressEntry`: these endpoints return raw ORM rows (no `response_model`). Field names above follow the SDD entities. If a field is absent at runtime the UI renders it as "—" (screens must guard with `??`). This is acceptable for the manual click-through.

- [ ] **Step 3: Create `frontend/lib/api/useResource.ts`**

```ts
"use client";
import { useEffect, useState } from "react";
import { ApiError } from "./client";

export function useResource<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => alive && setData(d))
      .catch((e: unknown) =>
        alive && setError(e instanceof ApiError ? e.message : "Request failed")
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, setData };
}
```

- [ ] **Step 4: Create `frontend/lib/api/specialist.ts`**

```ts
import { request } from "./client";
import type {
  ActivityLog, ClientSummary, ContentIn, ContentOut, DietaryLog,
  FeedbackIn, MealPlanIn, MealPlanOut, ProgressEntry,
} from "./types";

export const listClients = () => request<ClientSummary[]>("/specialist/clients");
export const getClient = (id: string) => request<ClientSummary>(`/specialist/clients/${id}`);
export const clientActivity = (id: string) =>
  request<ActivityLog[]>(`/specialist/clients/${id}/activity`);
export const clientDiet = (id: string) =>
  request<DietaryLog[]>(`/specialist/clients/${id}/diet`);
export const clientProgress = (id: string) =>
  request<ProgressEntry[]>(`/specialist/clients/${id}/progress`);

export const listMealPlans = () => request<MealPlanOut[]>("/specialist/meal-plans");
export const createMealPlan = (body: MealPlanIn) =>
  request<MealPlanOut>("/specialist/meal-plans", { method: "POST", body: JSON.stringify(body) });

export const listContent = () => request<ContentOut[]>("/specialist/content");
export const createContent = (body: ContentIn) =>
  request<ContentOut>("/specialist/content", { method: "POST", body: JSON.stringify(body) });

export const submitFeedback = (body: FeedbackIn) =>
  request<unknown>("/specialist/feedback", { method: "POST", body: JSON.stringify(body) });
```

- [ ] **Step 5: Create `frontend/lib/api/admin.ts`**

```ts
import { request } from "./client";
import type { AdminStats, AnnouncementIn, AnnouncementOut, AuditEntry, UserOut } from "./types";

export const listUsers = () => request<UserOut[]>("/admin/users");
export const setUserStatus = (id: string, status: string) =>
  request<UserOut>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const setUserRole = (id: string, role: string) =>
  request<UserOut>(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });

export const getStats = () => request<AdminStats>("/admin/stats");
export const getAuditLog = () => request<AuditEntry[]>("/admin/audit-log");

export const listAnnouncements = () => request<AnnouncementOut[]>("/admin/announcements");
export const createAnnouncement = (body: AnnouncementIn) =>
  request<AnnouncementOut>("/admin/announcements", { method: "POST", body: JSON.stringify(body) });
```

> NOTE: confirm the exact PATCH body keys (`status`, `role`) against `backend/app/subsystems/admin/router.py` during implementation; adjust if the handler expects a different field name or query param.

- [ ] **Step 6: Create `frontend/lib/format.ts`**

```ts
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
```

- [ ] **Step 7: Verify typecheck**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/lib
git commit -m "$(printf 'feat(web): add typed API layer with dev-JWT and 501 contract\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: UI primitives

**Files:**
- Create: `frontend/components/ui/Label.tsx`, `Hairline.tsx`, `Button.tsx`, `Chip.tsx`, `Badge.tsx`, `Progress.tsx`, `BarChart.tsx`

- [ ] **Step 1: Create `frontend/components/ui/Label.tsx`**

```tsx
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-sans font-medium text-[9px] uppercase tracking-label text-muted ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create `frontend/components/ui/Hairline.tsx`**

```tsx
export function Hairline({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-border ${className}`} />;
}
```

- [ ] **Step 3: Create `frontend/components/ui/Button.tsx`**

```tsx
"use client";
type Variant = "primary" | "dark" | "ghost";
type Size = "sm" | "md";

export function Button({
  children, variant = "primary", size = "md", onClick, type = "button", disabled,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const variants: Record<Variant, string> = {
    primary: "bg-coral text-charcoal border-0 hover:brightness-95",
    dark: "bg-charcoal text-cream border-0 hover:brightness-110",
    ghost: "bg-transparent text-charcoal border border-border hover:bg-white hover:border-charcoal",
  };
  const sizes: Record<Size, string> = {
    sm: "h-[34px] px-4 text-[10px]",
    md: "h-[42px] px-[22px] text-[11px]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-bold uppercase tracking-label transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Create `frontend/components/ui/Chip.tsx`**

```tsx
"use client";
export function Chip({
  children, active, onClick,
}: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-[30px] px-[14px] text-[12px] font-sans whitespace-nowrap border transition ${
        active
          ? "bg-charcoal text-cream border-charcoal font-semibold"
          : "bg-transparent text-subtle border-border"
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Create `frontend/components/ui/Badge.tsx`**

```tsx
type Tone = "neutral" | "good" | "warn" | "live" | "draft" | "archived" | "flag";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    neutral: "bg-transparent text-subtle border border-border",
    good: "bg-transparent text-good border border-good-border",
    warn: "bg-coral text-charcoal border-0",
    live: "bg-charcoal text-cream border-0",
    draft: "bg-transparent text-muted border border-border",
    archived: "bg-transparent text-muted border border-dashed border-border",
    flag: "bg-transparent text-charcoal border border-charcoal",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-[9px] font-sans font-bold uppercase tracking-wider leading-none whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 6: Create `frontend/components/ui/Progress.tsx`**

```tsx
export function Progress({ pct, className = "" }: { pct: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`relative h-[2px] w-full bg-border ${className}`}>
      <div className="absolute left-0 top-0 h-[2px] bg-coral" style={{ width: `${clamped}%` }} />
    </div>
  );
}
```

- [ ] **Step 7: Create `frontend/components/ui/BarChart.tsx`**

```tsx
import { Label } from "./Label";

export function BarChart({
  data, height = 120, highlightLast = true,
}: {
  data: { k: string; v: number }[];
  height?: number;
  highlightLast?: boolean;
}) {
  if (data.length === 0) return <Label>No data</Label>;
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="flex items-end gap-[10px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div
            className={`w-full ${highlightLast && i === data.length - 1 ? "bg-coral" : "bg-border"}`}
            style={{ height: `${(d.v / max) * 100}%` }}
          />
          <Label className="!text-[8px]">{d.k}</Label>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Verify typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/components/ui
git commit -m "$(printf 'feat(web): add UI primitives (Button, Chip, Badge, Progress, BarChart, Label, Hairline)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 4: Shell (Sidebar, TopBar, Avatar) + Specialist/Admin layouts

**Files:**
- Create: `frontend/components/shell/Avatar.tsx`, `Sidebar.tsx`, `TopBar.tsx`
- Create: `frontend/app/specialist/layout.tsx`, `frontend/app/admin/layout.tsx`

- [ ] **Step 1: Create `frontend/components/shell/Avatar.tsx`**

```tsx
export function Avatar({ letter = "A", size = 34 }: { letter?: string; size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full border border-charcoal font-sans text-charcoal"
      style={{ width: size, height: size, fontSize: size < 40 ? 13 : 26, fontFamily: size >= 40 ? "var(--font-garamond)" : undefined }}
    >
      {letter}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/components/shell/Sidebar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
}

export function Sidebar({
  items, role, accent = "coral",
}: {
  items: NavItem[];
  role: string;
  accent?: "coral" | "charcoal";
}) {
  const pathname = usePathname();
  const accentColor = accent === "coral" ? "var(--coral)" : "var(--charcoal)";

  return (
    <aside className="flex w-60 flex-none flex-col border-r border-border bg-cream">
      <div className="flex items-center gap-[9px] px-6 pb-[22px] pt-[26px]">
        <span className="h-3 w-3 bg-warm-red" />
        <span className="font-sans text-[17px] font-medium tracking-tight text-charcoal">onefit</span>
      </div>
      <div className="mx-0 mb-[14px] h-px bg-border" />
      <nav className="flex flex-col gap-[2px]">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-center gap-3 px-6 py-[11px]"
              style={{ borderLeft: `2px solid ${active ? accentColor : "transparent"}` }}
            >
              <span
                className="h-[6px] w-[6px] flex-none"
                style={{ background: active ? accentColor : "var(--border)" }}
              />
              <span
                className="font-sans text-[13px]"
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--charcoal)" : "var(--subtle)",
                }}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border px-6 py-5">
        <div className="font-sans text-[9px] font-medium uppercase tracking-label text-muted">
          {role}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create `frontend/components/shell/TopBar.tsx`**

```tsx
import { Avatar } from "./Avatar";

export function TopBar({
  title, search = "Search", avatarLetter = "W",
}: {
  title: string;
  search?: string;
  avatarLetter?: string;
}) {
  return (
    <div className="flex h-[68px] flex-none items-center justify-between border-b border-border px-9">
      <span className="font-sans text-[16px] font-semibold text-charcoal">{title}</span>
      <div className="flex items-center gap-6">
        <div className="flex w-[220px] items-center gap-2 border-b border-border pb-[6px]">
          <span className="text-[13px] text-muted">⌕</span>
          <input
            placeholder={search}
            className="w-full border-0 bg-transparent font-sans text-[13px] text-charcoal outline-none"
          />
        </div>
        <Avatar letter={avatarLetter} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/app/specialist/layout.tsx`**

```tsx
import { Sidebar, type NavItem } from "@/components/shell/Sidebar";

const SPECIALIST_NAV: NavItem[] = [
  { label: "Clients", href: "/specialist/clients" },
  { label: "Plans", href: "/specialist/plans/new" },
  { label: "Content", href: "/specialist/content" },
  { label: "Reports", href: "/specialist/reports" },
];

export default function SpecialistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream font-sans">
      <Sidebar items={SPECIALIST_NAV} role="Wellness Specialist" accent="coral" />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/app/admin/layout.tsx`**

```tsx
import { Sidebar, type NavItem } from "@/components/shell/Sidebar";

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Announcements", href: "/admin/announcements" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream font-sans">
      <Sidebar items={ADMIN_NAV} role="Administrator" accent="charcoal" />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
```

- [ ] **Step 6: Verify typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. (Layouts render but their child pages come in later tasks.)

- [ ] **Step 7: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/components/shell frontend/app/specialist/layout.tsx frontend/app/admin/layout.tsx
git commit -m "$(printf 'feat(web): add shell (Sidebar, TopBar, Avatar) and actor layouts\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 5: Backend — restore orphaned specialist routes

**Files:**
- Modify: `backend/app/subsystems/wellness_specialist/router.py`
- Reference (read-only): `backend/app/subsystems/wellness_specialist/router.py 19-23-50-863.py`
- Delete: `backend/app/subsystems/wellness_specialist/router.py 19-23-50-863.py`
- Test: `backend/tests/test_smoke.py` (existing)

- [ ] **Step 1: Diff the two routers to see exactly what's missing**

Run:
```bash
cd backend && diff app/subsystems/wellness_specialist/router.py "app/subsystems/wellness_specialist/router.py 19-23-50-863.py"
```
Expected: the orphaned file adds `ClientSummary`, `MealPlanIn`, `MealPlanOut` schemas, the `/clients`, `/clients/{id}`, `/clients/{id}/activity|diet|progress`, and `/meal-plans` (GET+POST) handlers, plus their imports (`MealPlan`, `ActivityLog`, `DietaryLog`, `ProgressEntry`, `FitnessProfile`, `func`, `dt`, `Any`). Note these additions.

- [ ] **Step 2: Confirm the active router and its current imports**

Run:
```bash
cd backend && sed -n '1,75p' app/subsystems/wellness_specialist/router.py
```
Expected: shows current imports + `ContentIn`/`FeedbackIn` schemas + `/content` and `/feedback` handlers. Identify which imports/models the restored code needs that aren't already imported.

- [ ] **Step 3: Add the missing schemas + handlers into the active router**

Edit `backend/app/subsystems/wellness_specialist/router.py`:
1. Add any missing imports at the top (mirror them from the orphaned file): the ORM entities (`MealPlan`, `ActivityLog`, `DietaryLog`, `ProgressEntry`, `FitnessProfile`), `from sqlalchemy import func, select`, `import datetime as dt`, `import uuid`, `from typing import Any`. Only add ones not already present.
2. Add the `ClientSummary`, `MealPlanIn`, `MealPlanOut` Pydantic classes (copy verbatim from the orphaned file).
3. Add the `_client_row` helper and the handlers: `list_clients`, `get_client`, `client_activity`, `client_diet`, `client_progress`, `list_meal_plans`, `create_meal_plan` (copy verbatim from the orphaned file).

> The handlers reference `SpecialistDep`, `DbDep`, `_now`, `notify` — verify these already exist in the active router (they do, used by `/feedback`). Reuse them; do not redefine.

- [ ] **Step 4: Delete the orphaned duplicate**

Run:
```bash
cd backend && git rm "app/subsystems/wellness_specialist/router.py 19-23-50-863.py"
```

- [ ] **Step 5: Run the smoke test**

Run:
```bash
cd backend && source env/bin/activate && python -m pytest tests/test_smoke.py -q
```
Expected: PASS. The smoke test exercises routing + auth guards without a DB; the new routes should register and be guarded by `require_specialist` (401/403 without a token, not 404).

- [ ] **Step 6: Verify the routes register**

Run:
```bash
cd backend && source env/bin/activate && python -c "from app.main import app; print([r.path for r in app.routes if '/specialist/' in getattr(r,'path','')])"
```
Expected: list includes `/specialist/clients`, `/specialist/clients/{user_id}`, `/specialist/clients/{user_id}/activity`, `/specialist/clients/{user_id}/diet`, `/specialist/clients/{user_id}/progress`, `/specialist/meal-plans`.

- [ ] **Step 7: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add "backend/app/subsystems/wellness_specialist/router.py"
git commit -m "$(printf 'feat(backend): restore specialist clients + meal-plans routes\n\nMoves the client roster, per-client activity/diet/progress, and meal-plan\nendpoints from the orphaned duplicate into the active router so the web\nfrontend can wire to live data. meal_plans table already exists (0004).\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 6: ClientList screen

**Files:**
- Create: `frontend/app/specialist/clients/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listClients } from "@/lib/api/specialist";
import { relativeTime } from "@/lib/format";
import type { ClientSummary } from "@/lib/api/types";

// Client-side heuristic until the backend exposes a progress field (documented in spec).
function derive(c: ClientSummary): { pct: number; alert: string | null } {
  const ms = c.last_active_at ? Date.now() - new Date(c.last_active_at).getTime() : Infinity;
  const days = ms / 86400000;
  let pct = 60;
  if (days < 1) pct = 85;
  else if (days < 3) pct = 60;
  else if (days < 7) pct = 35;
  else pct = 12;
  let alert: string | null = null;
  if (days >= 5) alert = `Inactive ${Math.floor(days)} days`;
  return { pct, alert };
}

const FILTERS = ["All clients", "On track", "At risk", "New this week"];

export default function ClientListPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("All clients");
  const { data, error, loading } = useResource<ClientSummary[]>(listClients, []);

  const rows = useMemo(() => {
    const list = (data ?? []).map((c) => ({ c, d: derive(c) }));
    if (filter === "On track") return list.filter((r) => r.d.pct >= 60);
    if (filter === "At risk") return list.filter((r) => r.d.alert !== null);
    return list;
  }, [data, filter]);

  return (
    <>
      <TopBar title="Clients" search="Search clients" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-[22px] flex items-end justify-between">
            <div>
              <Label>Your roster · {data?.length ?? 0} active</Label>
              <div className="mt-2 whitespace-nowrap font-serif text-[26px] text-charcoal">
                Good to see you, Jordan.
              </div>
            </div>
            <Button size="sm">+ Add client</Button>
          </div>

          <div className="mb-[18px] flex gap-[10px]">
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
            ))}
          </div>

          <div
            className="grid items-center px-1 pb-3"
            style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.6fr 1.6fr" }}
          >
            {["Client", "Last active", "Current goal", "Progress", "Alerts"].map((h) => (
              <Label key={h}>{h}</Label>
            ))}
          </div>
          <Hairline />

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="py-8"><Label>No clients yet</Label></div>
          )}

          {rows.map(({ c, d }) => (
            <div
              key={c.user_id}
              onClick={() => router.push(`/specialist/clients/${c.user_id}`)}
              className="cursor-pointer"
            >
              <div
                className="grid items-center px-1 py-[18px]"
                style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.6fr 1.6fr" }}
              >
                <div className="flex items-center gap-3">
                  <Avatar letter={(c.name ?? c.email)[0]?.toUpperCase() ?? "?"} />
                  <span className="font-serif text-[16px] text-charcoal">{c.name ?? c.email}</span>
                </div>
                <span className="font-sans text-[13px] text-muted">{relativeTime(c.last_active_at)}</span>
                <span className="font-sans text-[13px] text-subtle">{c.goal ?? "—"}</span>
                <div className="flex items-center gap-3">
                  <Progress pct={d.pct} className="!w-[90px]" />
                  <span className="font-sans text-[13px] font-semibold text-charcoal">{d.pct}%</span>
                </div>
                <span>
                  {d.alert ? <Badge tone="warn">{d.alert}</Badge> : <span className="text-[12px] text-border">—</span>}
                </span>
              </div>
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Manual check (if backend running with dev JWT)**

Start backend (`uvicorn app.main:app --reload`) and `npm run dev`; visit `http://localhost:3000/specialist/clients`. Expected: roster loads from `/specialist/clients` (or a clear error if no JWT). Filter chips work; row click navigates.

- [ ] **Step 4: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/specialist/clients/page.tsx
git commit -m "$(printf 'feat(web): ClientList wired to /specialist/clients\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 7: ClientDetail + Feedback module (SRS UC3, UC7)

**Files:**
- Create: `frontend/app/specialist/clients/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BarChart } from "@/components/ui/BarChart";
import { useResource } from "@/lib/api/useResource";
import { getClient, clientActivity, clientProgress, submitFeedback } from "@/lib/api/specialist";
import { relativeTime } from "@/lib/format";
import type { ActivityLog, ClientSummary, ProgressEntry } from "@/lib/api/types";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useResource<ClientSummary>(() => getClient(id), [id]);
  const activity = useResource<ActivityLog[]>(() => clientActivity(id), [id]);
  const progress = useResource<ProgressEntry[]>(() => clientProgress(id), [id]);

  const draftKey = `onefit-feedback-${id}`;
  const [notes, setNotes] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(draftKey) ?? "" : ""
  );
  const [planUpdated, setPlanUpdated] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const onNotes = (v: string) => {
    setNotes(v);
    if (typeof window !== "undefined") window.localStorage.setItem(draftKey, v);
  };

  const send = async () => {
    if (!notes.trim()) return;
    setSending(true);
    setSendError(null);
    setSent(null);
    try {
      await submitFeedback({ user_id: id, notes, plan_updated: planUpdated });
      setSent("Feedback sent — the client has been notified.");
      onNotes("");
      setPlanUpdated(false);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const c = client.data;
  const weightSeries = (progress.data ?? [])
    .slice()
    .reverse()
    .filter((p) => p.weight != null)
    .map((p, i) => ({ k: `#${i + 1}`, v: Number(p.weight) }));

  return (
    <>
      <TopBar title="Client" search="Search clients" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[26px]">
          <span
            onClick={() => router.push("/specialist/clients")}
            className="cursor-pointer font-sans text-[12px] text-muted"
          >
            ‹ Back to clients
          </span>

          {client.loading && <div className="py-8"><Label>Loading…</Label></div>}
          {client.error && <div className="py-8 text-[13px] text-coral">{client.error}</div>}

          {c && (
            <>
              <div className="my-[20px] mb-[26px] flex items-center justify-between">
                <div className="flex items-center gap-[18px]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-charcoal font-serif text-[26px] text-charcoal">
                    {(c.name ?? c.email)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-serif text-[26px] text-charcoal">{c.name ?? c.email}</div>
                    <div className="mt-2 flex items-center gap-4">
                      <Label>Goal · {c.goal ?? "—"}</Label>
                      <Badge tone="good">Plan active</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Hairline />

              <div
                className="mt-[26px] grid gap-0"
                style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}
              >
                {/* left: weight trend + activity */}
                <div className="border-r border-border pr-8">
                  <Label>Weight trend · recent</Label>
                  <div className="my-[12px] mb-[18px] flex items-baseline gap-[10px]">
                    <span className="font-serif text-[36px] text-charcoal">
                      {c.weight != null ? c.weight.toFixed(1) : "—"}
                    </span>
                  </div>
                  <BarChart data={weightSeries} height={110} />
                  <div className="mt-[26px]">
                    <Label>Recent activity</Label>
                    <div className="mt-[6px]">
                      {(activity.data ?? []).length === 0 && (
                        <div className="py-3"><Label>No activity logged</Label></div>
                      )}
                      {(activity.data ?? []).map((a) => (
                        <div key={a.log_id}>
                          <div className="py-[14px]">
                            <div className="flex items-baseline justify-between">
                              <span className="font-sans text-[13px] text-charcoal">
                                {a.activity_type ?? "Activity"}
                              </span>
                              <Label>{relativeTime(a.log_date)}</Label>
                            </div>
                            <div className="mt-[5px] font-sans text-[12px] text-muted">
                              {[a.duration_minutes && `${a.duration_minutes} min`,
                                a.calories_burned && `${a.calories_burned} kcal`,
                                a.intensity]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </div>
                          </div>
                          <Hairline />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* middle: meal plan placeholder (no current-plan endpoint) */}
                <div className="border-r border-border px-8">
                  <Label>Current meal plan</Label>
                  <div className="my-[12px] mb-[4px] font-sans text-[15px] font-semibold text-charcoal">
                    {c.goal ? `Goal: ${c.goal}` : "No active plan"}
                  </div>
                  <div className="mb-[22px] font-sans text-[12px] text-muted">
                    Build a plan from the Plans tab.
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/specialist/plans/new")}>
                    Open meal-plan builder
                  </Button>
                </div>

                {/* right: feedback module (UC3) */}
                <div className="pl-8">
                  <Label>Send feedback</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder="Write advice or a note for this client…"
                    className="mt-[14px] h-[120px] w-full resize-none border border-border bg-white p-3 font-sans text-[13px] leading-relaxed text-charcoal outline-none focus:border-charcoal"
                  />
                  <label className="mt-3 flex items-center gap-2 font-sans text-[12px] text-subtle">
                    <input
                      type="checkbox"
                      checked={planUpdated}
                      onChange={(e) => setPlanUpdated(e.target.checked)}
                    />
                    I updated their plan
                  </label>
                  <div className="mt-3">
                    <Button size="sm" onClick={send} disabled={sending || !notes.trim()}>
                      {sending ? "Sending…" : "Send feedback"}
                    </Button>
                  </div>
                  {sent && <div className="mt-3 font-sans text-[12px] text-good">{sent}</div>}
                  {sendError && <div className="mt-3 font-sans text-[12px] text-coral">{sendError}</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/specialist/clients/\[id\]/page.tsx
git commit -m "$(printf 'feat(web): ClientDetail with Feedback module (UC3) and weight trend (UC7)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 8: CreateMealPlan screen

**Files:**
- Create: `frontend/app/specialist/plans/new/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useResource } from "@/lib/api/useResource";
import { listClients, createMealPlan } from "@/lib/api/specialist";
import type { ClientSummary } from "@/lib/api/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
type Item = { name: string; kcal: number };
type DayPlan = Record<string, Item[]>;

export default function CreateMealPlanPage() {
  const clients = useResource<ClientSummary[]>(listClients, []);
  const [name, setName] = useState("Lean & Steady · Week 1");
  const [goal, setGoal] = useState("maintain");
  const [day, setDay] = useState("Mon");
  const [plan, setPlan] = useState<Record<string, DayPlan>>(() =>
    Object.fromEntries(DAYS.map((d) => [d, Object.fromEntries(MEALS.map((m) => [m, []]))]))
  );
  const [clientId, setClientId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dayKcal = useMemo(
    () =>
      MEALS.reduce(
        (sum, m) => sum + (plan[day][m] ?? []).reduce((s, it) => s + it.kcal, 0),
        0
      ),
    [plan, day]
  );

  const addItem = (meal: string) => {
    const nameInput = window.prompt("Food name?");
    if (!nameInput) return;
    const kcalInput = Number(window.prompt("Calories?") ?? "0");
    setPlan((p) => ({
      ...p,
      [day]: { ...p[day], [meal]: [...p[day][meal], { name: nameInput, kcal: kcalInput || 0 }] },
    }));
  };

  const buildPayload = () =>
    DAYS.map((d) => ({
      day: d,
      meals: MEALS.map((m) => ({ meal: m, items: plan[d][m] })),
    }));

  const save = async (publish: boolean) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (publish && !clientId) {
        setErr("Select a client to publish, or use Save draft.");
        setBusy(false);
        return;
      }
      await createMealPlan({
        name,
        goal,
        days_per_week: 7,
        payload: buildPayload(),
        client_id: publish ? clientId : null,
      });
      setMsg(publish ? "Plan published — client notified." : "Draft saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Plans" search="Search foods" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-between border-b border-border px-9 py-[22px]">
          <div>
            <Label>New meal plan · draft</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-[6px] block w-[420px] border-0 bg-transparent font-serif text-[24px] text-charcoal outline-none"
            />
          </div>
          <div className="flex items-center gap-[10px]">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-[34px] border border-border bg-white px-2 font-sans text-[12px] text-charcoal"
            >
              <option value="">Template (no client)</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.user_id} value={c.user_id}>{c.name ?? c.email}</option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={() => save(false)} disabled={busy}>Save draft</Button>
            <Button size="sm" onClick={() => save(true)} disabled={busy}>Publish plan</Button>
          </div>
        </div>

        <div className="flex gap-2 px-9 pt-5">
          {DAYS.map((d) => (
            <Chip key={d} active={day === d} onClick={() => setDay(d)}>{d}</Chip>
          ))}
        </div>

        <div className="grid px-9 py-[26px]" style={{ gridTemplateColumns: "1fr 320px" }}>
          <div className="pr-10">
            {MEALS.map((meal) => {
              const items = plan[day][meal];
              const kcal = items.reduce((s, it) => s + it.kcal, 0);
              return (
                <div key={meal} className="mb-[14px]">
                  <div className="mb-[10px] flex items-baseline justify-between">
                    <span className="font-sans text-[14px] font-semibold text-charcoal">{meal}</span>
                    <Label>{kcal} kcal</Label>
                  </div>
                  {items.map((it, i) => (
                    <div key={i}>
                      <div className="flex justify-between py-[11px]">
                        <span className="font-sans text-[13px] text-charcoal">{it.name}</span>
                        <span className="font-sans text-[13px] text-muted">{it.kcal}</span>
                      </div>
                      <Hairline />
                    </div>
                  ))}
                  <div
                    onClick={() => addItem(meal)}
                    className="mt-3 flex h-12 cursor-pointer items-center justify-center gap-[10px] border border-dashed border-muted"
                  >
                    <span className="text-[13px] text-subtle">+</span>
                    <span className="font-sans text-[11px] uppercase tracking-wider text-subtle">Add food</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-l border-border pl-8">
            <Label>Live summary · {day}</Label>
            <div className="my-[14px] mb-[6px] flex items-baseline gap-2">
              <span className="font-serif text-[38px] text-charcoal">{dayKcal.toLocaleString()}</span>
              <span className="font-sans text-[12px] text-muted">kcal</span>
            </div>
            <Progress pct={Math.min(100, (dayKcal / 1850) * 100)} />
            <Hairline className="my-5" />
            <div className="flex justify-between">
              <Label>Meals</Label>
              <span className="font-sans text-[13px] text-charcoal">
                {MEALS.filter((m) => plan[day][m].length > 0).length}
              </span>
            </div>
            {msg && <div className="mt-4 font-sans text-[12px] text-good">{msg}</div>}
            {err && <div className="mt-4 font-sans text-[12px] text-coral">{err}</div>}
          </div>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/specialist/plans/new/page.tsx
git commit -m "$(printf 'feat(web): CreateMealPlan builder wired to /specialist/meal-plans\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 9: Content screen (SRS UC5)

**Files:**
- Create: `frontend/app/specialist/content/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listContent, createContent } from "@/lib/api/specialist";
import type { ContentOut } from "@/lib/api/types";

const FILTERS = ["All", "Draft", "Published"];
function toneFor(status: string): "live" | "draft" | "archived" {
  const s = status.toLowerCase();
  if (s.includes("publish")) return "live";
  if (s.includes("archiv")) return "archived";
  return "draft";
}

export default function ContentPage() {
  const { data, error, loading, setData } = useResource<ContentOut[]>(listContent, []);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "", media_url: "", permission_confirmed: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shown = useMemo(() => {
    const list = data ?? [];
    if (filter === "All") return list;
    return list.filter((c) => c.status.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim() || !form.category.trim()) {
      setErr("Title, body and category are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const created = await createContent({
        title: form.title,
        body: form.body,
        category: form.category,
        media_url: form.media_url || null,
        permission_confirmed: form.permission_confirmed,
      });
      setData([created, ...(data ?? [])]);
      setShowForm(false);
      setForm({ title: "", body: "", category: "", media_url: "", permission_confirmed: false });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Content" search="Search content" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-[22px] flex items-center justify-between">
            <div className="flex gap-[10px]">
              {FILTERS.map((f) => (
                <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Close" : "+ Create content"}
            </Button>
          </div>

          {showForm && (
            <div className="mb-8 border border-border bg-white p-6">
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <input placeholder="Title" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="border border-border bg-white p-2 font-sans text-[13px] outline-none" />
                <input placeholder="Category (e.g. Mental resilience)" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="border border-border bg-white p-2 font-sans text-[13px] outline-none" />
              </div>
              <textarea placeholder="Body" value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="mt-3 h-24 w-full resize-none border border-border bg-white p-2 font-sans text-[13px] outline-none" />
              <input placeholder="Media URL (optional)" value={form.media_url}
                onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                className="mt-3 w-full border border-border bg-white p-2 font-sans text-[13px] outline-none" />
              <label className="mt-3 flex items-center gap-2 font-sans text-[12px] text-subtle">
                <input type="checkbox" checked={form.permission_confirmed}
                  onChange={(e) => setForm({ ...form, permission_confirmed: e.target.checked })} />
                I confirm I have the rights to publish this content.
              </label>
              {err && <div className="mt-3 font-sans text-[12px] text-coral">{err}</div>}
              <div className="mt-4"><Button size="sm" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save content"}</Button></div>
            </div>
          )}

          {loading && <Label>Loading…</Label>}
          {error && <div className="text-[13px] text-coral">{error}</div>}
          {!loading && !error && shown.length === 0 && <Label>No content yet</Label>}

          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {shown.map((p) => (
              <div key={p.content_id} className="flex min-h-[150px] flex-col border border-border p-[22px]">
                <div><Badge tone={toneFor(p.status)}>{p.status}</Badge></div>
                <div className="mt-[18px] font-sans text-[18px] font-semibold text-charcoal">{p.title}</div>
                <div className="mt-2 font-sans text-[12px] text-muted">{p.category}</div>
                <div className="mt-auto pt-[18px]">
                  <span className="cursor-pointer border-b border-charcoal pb-[2px] font-sans text-[10px] font-bold uppercase tracking-label text-charcoal">
                    Edit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/specialist/content/page.tsx
git commit -m "$(printf 'feat(web): specialist Content screen wired to /specialist/content (UC5)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 10: Reports / Health Trends screen (SRS UC7)

**Files:**
- Create: `frontend/app/specialist/reports/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { BarChart } from "@/components/ui/BarChart";
import { useResource } from "@/lib/api/useResource";
import { listClients } from "@/lib/api/specialist";
import type { ClientSummary } from "@/lib/api/types";

export default function ReportsPage() {
  const { data, error, loading } = useResource<ClientSummary[]>(listClients, []);
  const clients = data ?? [];

  const goalCounts = clients.reduce<Record<string, number>>((acc, c) => {
    const g = c.goal ?? "Unspecified";
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});
  const goalData = Object.entries(goalCounts).map(([k, v]) => ({ k, v }));

  const withWeight = clients.filter((c) => c.weight != null);
  const avgWeight = withWeight.length
    ? withWeight.reduce((s, c) => s + Number(c.weight), 0) / withWeight.length
    : null;

  return (
    <>
      <TopBar title="Reports" search="Search" avatarLetter="J" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <Label>Roster health trends</Label>

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}

          {!loading && !error && clients.length === 0 && (
            <div className="py-8"><Label>Not enough data — clients need to log progress.</Label></div>
          )}

          {!loading && !error && clients.length > 0 && (
            <div className="mt-6 grid gap-0" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
              <div className="border-r border-border pr-8">
                <Label>Clients by goal</Label>
                <div className="mt-4"><BarChart data={goalData} height={160} highlightLast={false} /></div>
              </div>
              <div className="pl-8">
                <Label>Roster summary</Label>
                <div className="mt-4 flex justify-between py-2">
                  <span className="font-sans text-[13px] text-subtle">Active clients</span>
                  <span className="font-sans text-[13px] font-semibold text-charcoal">{clients.length}</span>
                </div>
                <Hairline />
                <div className="flex justify-between py-2">
                  <span className="font-sans text-[13px] text-subtle">Avg. weight (kg)</span>
                  <span className="font-sans text-[13px] font-semibold text-charcoal">
                    {avgWeight != null ? avgWeight.toFixed(1) : "—"}
                  </span>
                </div>
                <Hairline />
                <div className="flex justify-between py-2">
                  <span className="font-sans text-[13px] text-subtle">Tracking weight</span>
                  <span className="font-sans text-[13px] font-semibold text-charcoal">
                    {withWeight.length}/{clients.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/specialist/reports/page.tsx
git commit -m "$(printf 'feat(web): Reports / Health Trends screen (UC7)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 11: AdminDashboard screen

**Files:**
- Create: `frontend/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { useResource } from "@/lib/api/useResource";
import { getStats, getAuditLog } from "@/lib/api/admin";
import { relativeTime } from "@/lib/format";
import type { AdminStats, AuditEntry } from "@/lib/api/types";

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-3 p-[22px]">
      <Label>{label}</Label>
      <span className="font-sans text-[32px] font-bold leading-none text-charcoal">{value}</span>
      <span className="font-sans text-[12px] text-muted">{sub}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const stats = useResource<AdminStats>(getStats, []);
  const audit = useResource<AuditEntry[]>(getAuditLog, []);
  const s = stats.data;

  return (
    <>
      <TopBar title="Dashboard" search="Search" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <Label>System overview · live</Label>

          {stats.error && <div className="mt-4 text-[13px] text-coral">{stats.error}</div>}

          <div className="mt-4 grid border border-border" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="border-r border-border">
              <Kpi label="Total users" value={s ? String(s.total_users) : "—"} sub={s ? `${s.total_gym_users} gym users` : ""} />
            </div>
            <div className="border-r border-border">
              <Kpi label="Wellness specialists" value={s ? String(s.total_specialists) : "—"} sub={s ? `${s.total_admins} admins` : ""} />
            </div>
            <div className="border-r border-border">
              <Kpi label="Active today" value={s ? String(s.active_today) : "—"} sub="logins today" />
            </div>
            <div>
              <Kpi label="Pending approvals" value={s ? String(s.pending_approvals) : "—"} sub="awaiting review" />
            </div>
          </div>

          <div className="mt-[34px]">
            <div className="mb-2 flex items-baseline justify-between">
              <Label>Recent activity</Label>
            </div>
            <Hairline />
            {audit.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {audit.error && <div className="py-6 text-[13px] text-coral">{audit.error}</div>}
            {!audit.loading && (audit.data ?? []).length === 0 && (
              <div className="py-6"><Label>No recent activity</Label></div>
            )}
            {(audit.data ?? []).map((e) => (
              <div key={e.log_id}>
                <div className="flex items-center justify-between py-[15px]">
                  <div className="flex items-center gap-[14px]">
                    <span className="h-[6px] w-[6px] bg-border" />
                    <span className="font-sans text-[13px] text-charcoal">
                      <b className="font-semibold">{e.actor_name ?? "System"}</b> {e.action}{" "}
                      <span className="text-subtle">{e.details ?? ""}</span>
                    </span>
                  </div>
                  <Label>{relativeTime(e.created_at)}</Label>
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

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/admin/dashboard/page.tsx
git commit -m "$(printf 'feat(web): AdminDashboard wired to /admin/stats + /admin/audit-log\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 12: UserManagement screen (SRS UC3)

**Files:**
- Create: `frontend/app/admin/users/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { useResource } from "@/lib/api/useResource";
import { listUsers, setUserStatus } from "@/lib/api/admin";
import { relativeTime, shortDate } from "@/lib/format";
import type { UserOut } from "@/lib/api/types";

const ROLE_FILTERS = ["All roles", "Members", "Specialists", "Admins"];
const roleMatch: Record<string, string> = {
  Members: "gym_user",
  Specialists: "wellness_specialist",
  Admins: "admin",
};
function statusTone(status: string): "good" | "flag" | "neutral" {
  const s = status.toLowerCase();
  if (s === "active") return "good";
  if (s === "suspended") return "flag";
  return "neutral";
}

const GRID = "32px 2fr 1.2fr 1.2fr 1.2fr 1fr 40px";

export default function UserManagementPage() {
  const { data, error, loading, setData } = useResource<UserOut[]>(listUsers, []);
  const [role, setRole] = useState("All roles");
  const [sel, setSel] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const users = useMemo(() => {
    const list = data ?? [];
    if (role === "All roles") return list;
    return list.filter((u) => u.role === roleMatch[role]);
  }, [data, role]);

  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const changeStatus = async (id: string, status: string) => {
    setActionErr(null);
    try {
      const updated = await setUserStatus(id, status);
      setData((data ?? []).map((u) => (u.user_id === id ? updated : u)));
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Action failed");
    }
    setMenu(null);
  };

  const bulk = async (status: string) => {
    for (const id of sel) await changeStatus(id, status);
    setSel([]);
  };

  return (
    <>
      <TopBar title="User management" search="Search users" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-[18px] flex items-center justify-between">
            <div className="flex gap-[10px]">
              {ROLE_FILTERS.map((r) => (
                <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>
              ))}
            </div>
            <Label>{users.length} users</Label>
          </div>

          <div
            className="mb-[2px] flex h-12 items-center justify-between px-4 transition"
            style={{ background: sel.length ? "var(--charcoal)" : "transparent", border: sel.length ? "none" : "1px solid var(--border)" }}
          >
            <span className="font-sans text-[12px]" style={{ color: sel.length ? "var(--cream)" : "var(--muted)" }}>
              {sel.length ? `${sel.length} selected` : "Select rows for bulk actions"}
            </span>
            <div className="flex gap-[18px]">
              {(["Suspend", "Activate"] as const).map((a) => (
                <span
                  key={a}
                  onClick={() => sel.length && bulk(a === "Suspend" ? "suspended" : "active")}
                  className="font-sans text-[10px] font-bold uppercase tracking-label"
                  style={{ color: sel.length ? "var(--cream)" : "var(--border)", cursor: sel.length ? "pointer" : "default" }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>

          {actionErr && <div className="py-2 text-[12px] text-coral">{actionErr}</div>}

          <div className="grid items-center px-1 pb-3 pt-[14px]" style={{ gridTemplateColumns: GRID }}>
            <span />
            {["Name", "Role", "Joined", "Status", "Last active", ""].map((h, i) => <Label key={i}>{h}</Label>)}
          </div>
          <Hairline />

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}

          {users.map((u) => (
            <div key={u.user_id} className="relative">
              <div
                className="grid items-center px-1 py-4"
                style={{ gridTemplateColumns: GRID, background: sel.includes(u.user_id) ? "var(--white)" : "transparent" }}
              >
                <span
                  onClick={() => toggle(u.user_id)}
                  className="inline-flex h-[15px] w-[15px] cursor-pointer items-center justify-center border border-subtle text-[10px] text-cream"
                  style={{ background: sel.includes(u.user_id) ? "var(--charcoal)" : "transparent" }}
                >
                  {sel.includes(u.user_id) ? "✓" : ""}
                </span>
                <div className="flex items-center gap-3">
                  <Avatar letter={(u.name ?? u.email)[0]?.toUpperCase() ?? "?"} />
                  <span className="font-sans text-[14px] text-charcoal">{u.name ?? u.email}</span>
                </div>
                <span className="font-sans text-[13px] text-subtle">{u.role}</span>
                <span className="font-sans text-[13px] text-muted">{shortDate(u.created_at)}</span>
                <span><Badge tone={statusTone(u.status)}>{u.status}</Badge></span>
                <span className="font-sans text-[13px] text-muted">—</span>
                <span
                  onClick={() => setMenu(menu === u.user_id ? null : u.user_id)}
                  className="cursor-pointer text-center text-[18px] tracking-widest text-subtle"
                >
                  ⋯
                </span>
              </div>
              {menu === u.user_id && (
                <div className="absolute right-2 top-[50px] z-20 min-w-[150px] border border-border bg-cream">
                  {(u.status.toLowerCase() === "suspended"
                    ? [["Activate", "active"]]
                    : [["Suspend", "suspended"]]
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      onClick={() => changeStatus(u.user_id, value)}
                      className="cursor-pointer border-b border-border px-4 py-[11px] font-sans text-[13px] text-charcoal"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/admin/users/page.tsx
git commit -m "$(printf 'feat(web): UserManagement wired to /admin/users with status actions (UC3)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 13: Announcements screen

**Files:**
- Create: `frontend/app/admin/announcements/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listAnnouncements, createAnnouncement } from "@/lib/api/admin";
import { relativeTime } from "@/lib/format";
import type { AnnouncementOut } from "@/lib/api/types";

const AUDIENCES = ["all", "gym_user", "wellness_specialist"];

export default function AnnouncementsPage() {
  const { data, error, loading, setData } = useResource<AnnouncementOut[]>(listAnnouncements, []);
  const [form, setForm] = useState({ title: "", body: "", target_audience: "all" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setErr("Title and body are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const created = await createAnnouncement(form);
      setData([created, ...(data ?? [])]);
      setForm({ title: "", body: "", target_audience: "all" });
      setOk("Announcement sent.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Announcements" search="Search" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <div className="mb-8 border border-border bg-white p-6">
            <Label>New announcement</Label>
            <input placeholder="Title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-3 w-full border border-border bg-white p-2 font-sans text-[13px] outline-none" />
            <textarea placeholder="Body" value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="mt-3 h-24 w-full resize-none border border-border bg-white p-2 font-sans text-[13px] outline-none" />
            <div className="mt-3 flex items-center gap-3">
              <select value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                className="h-[34px] border border-border bg-white px-2 font-sans text-[12px]">
                {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <Button size="sm" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send announcement"}</Button>
            </div>
            {err && <div className="mt-3 font-sans text-[12px] text-coral">{err}</div>}
            {ok && <div className="mt-3 font-sans text-[12px] text-good">{ok}</div>}
          </div>

          <Label>Sent announcements</Label>
          <Hairline className="mt-3" />
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && (data ?? []).length === 0 && <div className="py-6"><Label>None yet</Label></div>}
          {(data ?? []).map((a) => (
            <div key={a.announcement_id}>
              <div className="flex items-start justify-between py-4">
                <div>
                  <div className="font-sans text-[14px] font-semibold text-charcoal">{a.title}</div>
                  <div className="mt-1 font-sans text-[12px] text-muted">{a.body}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral">{a.target_audience}</Badge>
                  <Label>{relativeTime(a.sent_at)}</Label>
                </div>
              </div>
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/app/admin/announcements/page.tsx
git commit -m "$(printf 'feat(web): Admin Announcements screen wired to /admin/announcements\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 14: Final verification + README

**Files:**
- Create: `frontend/README.md`

- [ ] **Step 1: Create `frontend/README.md`**

```markdown
# OneFit Web (Specialist + Admin)

Next.js 14 web app for the OneFit Wellness Specialist and Admin surfaces, wired to the FastAPI/Supabase backend.

## Setup
```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_DEV_JWT to a Supabase access token
npm run dev                        # http://localhost:3000
```

`/` redirects to `/specialist/clients`. Admin surface is under `/admin/*`.

## Auth (dev)
No login screen yet. The API layer reads the JWT from `localStorage["onefit-jwt"]`, falling back to `NEXT_PUBLIC_DEV_JWT`. Paste a specialist or admin token to exercise the screens.

## Verify
`npm run build` and `npm run lint`. No automated tests (per repo convention) — click through the routes against a running backend.
```

- [ ] **Step 2: Full build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: both pass; build also generates output for all 9 routes (specialist x5, admin x3, root redirect).

- [ ] **Step 3: Backend smoke still green**

Run: `cd backend && source env/bin/activate && python -m pytest tests/test_smoke.py -q`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/wongkaishen/Documents/GitHub/OneFit
git add frontend/README.md
git commit -m "$(printf 'docs(web): add frontend README\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Self-review notes (coverage check)

- **Spec §3 layout / §4 styling / §5 auth** → Tasks 1, 2, 4. ✓
- **Spec §6.1 ClientList** → Task 6. ✓
- **§6.2 ClientDetail + Feedback (UC3) + weight trend (UC7)** → Task 7. ✓
- **§6.3 CreateMealPlan** → Task 8. ✓
- **§6.4 Content (UC5)** → Task 9. ✓
- **§6.5 Reports (UC7)** → Task 10. ✓
- **§6.6 AdminDashboard** → Task 11 (KPIs use real `AdminStats` fields; no fake health metric). ✓
- **§6.7 UserManagement (UC3)** → Task 12. ✓
- **§6.8 Announcements** → Task 13. ✓
- **§7 backend route restore** → Task 5. ✓
- **§8 verification** → Tasks 6–14 build/lint gates + Task 14 final. ✓
- **§9 deferred** (UC4 tasks, UC6 community, programs removal, real login) → not built, by design. ✓

**Known runtime caveats to confirm during implementation:**
1. Admin PATCH body keys (`status`/`role`) — verify against `admin/router.py` (Task 2 Step 5 note, Task 12).
2. Raw activity/diet/progress field names — verify against the ORM entities when wiring Task 7; guard missing fields with `??`.
3. Announcement `target_audience` allowed set — verify `VALID_AUDIENCE` in `admin/router.py`; adjust the `AUDIENCES` list in Task 13 if needed.
