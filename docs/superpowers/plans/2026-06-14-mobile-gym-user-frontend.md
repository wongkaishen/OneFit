# Mobile Gym User Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Gym User mobile frontend — Next.js, all 9 SDS-mocked screens, wired to Wong's FastAPI, demoable end-to-end.

**Architecture:** Next.js App Router (migrated from Vite). Frontend talks only to FastAPI over HTTP/JSON; JWT in localStorage. Single typed API client wraps every endpoint. Each screen is a Client Component (React state + interactivity). Design tokens from existing `src/styles/tokens.css`. No automated tests — manual click-through.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, existing OneFit design tokens. No state library — `useState` + local fetches. No automated tests.

**Out of scope (deferred to follow-up plans):** Wellness Specialist web screens, Admin web screens, offline IndexedDB queue, share-progress canvas composer, 2FA, Vercel deployment, Supabase Realtime.

---

## File Structure

After Phase 0 the project will look like this (Next.js App Router conventions):

```
src/
  app/
    layout.tsx                      // root layout, fonts, global CSS
    page.tsx                        // landing / redirect to /login or /dashboard
    globals.css                     // import tokens + base styles
    login/page.tsx
    register/page.tsx
    dashboard/page.tsx
    activity/page.tsx
    diet/page.tsx
    plan/page.tsx                   // Create Plan
    profile/page.tsx
    progress/page.tsx               // Update Progress
    calendar/page.tsx
    milestone/page.tsx
  api/
    client.ts                       // fetch wrapper + JWT injection
    auth.ts                         // /auth endpoints
    gymUser.ts                      // /gym-user endpoints
    notifications.ts                // /notifications endpoints
    types.ts                        // shared TS types matching backend models
  auth/
    AuthProvider.tsx                // context: user, jwt, login(), logout()
    useAuth.ts                      // hook
    guard.ts                        // redirect-if-not-authed helper
  mobile/                           // kept from current src/mobile/
    PhoneFrame.tsx
    Primitives.tsx
    screens/
      LoginScreen.tsx
      RegisterScreen.tsx            // NEW (Phase 3)
      DashboardScreen.tsx
      CreatePlanScreen.tsx          // NEW (Phase 3)
      LogActivityScreen.tsx
      LogDietScreen.tsx
      ProfileScreen.tsx             // NEW (Phase 3)
      UpdateProgressScreen.tsx      // NEW (Phase 3)
      CalendarScreen.tsx            // NEW (Phase 3)
      MilestoneScreen.tsx
  web/                              // existing draft screens — left untouched this plan
  styles/
    tokens.css                      // unchanged
    app.css                         // shell styles (toolbar, tweaks panel)
```

The migration converts `.jsx` → `.tsx` where new code is written; existing `.jsx` files keep their extension and are imported as-is (Next.js handles both).

---

## Phase 0 — Migrate Vite → Next.js

Goal: drop in Next.js, keep every existing screen rendering pixel-identically. After this phase, `npm run dev` starts Next.js on :3000 and all 5 mobile + 6 web screens still work.

### Task 0.1: Install Next.js dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Next.js and TypeScript tooling**

```bash
npm install next@14 typescript @types/react @types/node
npm uninstall vite @vitejs/plugin-react
```

- [ ] **Step 2: Replace scripts in `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

- [ ] **Step 3: Delete `vite.config.js` and root `index.html`**

```bash
rm vite.config.js index.html
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git rm vite.config.js index.html
git commit -m "chore: replace Vite with Next.js"
```

### Task 0.2: Add TypeScript config

**Files:**
- Create: `tsconfig.json`
- Create: `next-env.d.ts` (auto-generated on first `next dev`)

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add TypeScript config"
```

### Task 0.3: Create root layout + globals

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Delete: `src/main.jsx`

- [ ] **Step 1: Create `src/app/globals.css`**

```css
@import "../styles/tokens.css";
@import "../styles/app.css";
```

- [ ] **Step 2: Create `src/app/layout.tsx`**

```tsx
import "./globals.css";

export const metadata = {
  title: "OneFit",
  description: "Daily · movement",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Delete `src/main.jsx`**

```bash
rm src/main.jsx
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git rm src/main.jsx
git commit -m "feat: add Next.js root layout"
```

### Task 0.4: Move App shell into a page route

**Files:**
- Create: `src/app/page.tsx`
- Modify: `src/App.jsx` (rename to `src/AppShell.jsx`, mark client-only)

- [ ] **Step 1: Rename `App.jsx` to `AppShell.jsx`**

```bash
git mv src/App.jsx src/AppShell.jsx
```

- [ ] **Step 2: Add `"use client"` directive at the top of `src/AppShell.jsx`**

Open `src/AppShell.jsx`, add as the very first line:

```jsx
"use client";
```

- [ ] **Step 3: Create `src/app/page.tsx`**

```tsx
import AppShell from "../AppShell.jsx";

export default function Home() {
  return <AppShell />;
}
```

- [ ] **Step 4: Verify it runs**

```bash
npm run dev
```

Expected: dev server starts on http://localhost:3000, page loads, you see the existing toolbar + phone frame.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/AppShell.jsx
git commit -m "feat: mount AppShell at /"
```

### Task 0.5: Update .gitignore for Next.js artifacts

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append Next.js entries**

Open `.gitignore` and append:

```
.next
out
next-env.d.ts
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore Next.js build artifacts"
```

---

## Phase 1 — API client foundation

Goal: a single typed client every screen uses to talk to Wong's FastAPI.

### Task 1.1: Add `.env.local` and read the API base URL

**Files:**
- Create: `.env.local`
- Create: `.env.example`

- [ ] **Step 1: Create `.env.local`**

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

- [ ] **Step 2: Create `.env.example`**

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

- [ ] **Step 3: Verify `.env.local` is gitignored**

Run: `grep -F ".env.local" .gitignore`

If no match, append to `.gitignore`:

```
.env.local
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: document API base URL env var"
```

### Task 1.2: Shared TypeScript types

**Files:**
- Create: `src/api/types.ts`

- [ ] **Step 1: Write `src/api/types.ts`**

```ts
// Mirrors backend models. Add fields as backend evolves.

export type UserRole = "gym_user" | "wellness_specialist" | "admin";
export type UserStatus = "pending" | "active" | "suspended";

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface FitnessProfile {
  user_id: string;
  age: number;
  height: number;       // cm
  weight: number;       // kg
  body_fat_percent?: number;
  fitness_goal: string;
}

export interface WorkoutPlan {
  plan_id: string;
  user_id: string;
  goal: string;
  generated_by: string;
  status: "active" | "superseded";
  created_at: string;
}

export interface WorkoutSession {
  session_id: string;
  plan_id: string;
  scheduled_date: string;     // YYYY-MM-DD
  scheduled_time: string;     // HH:mm
  reminder_set: boolean;
  status: "scheduled" | "completed" | "missed";
}

export interface ActivityLog {
  log_id?: string;
  user_id?: string;
  workout_type: string;
  duration: number;             // minutes
  steps?: number;
  heart_rate?: number;
  calories_burned?: number;
  source: "manual" | "wearable";
  log_date: string;             // YYYY-MM-DD
  status?: "pending" | "completed";
}

export interface DietaryLog {
  log_id?: string;
  user_id?: string;
  meal_time: "breakfast" | "lunch" | "dinner" | "snack";
  food_item: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  entry_mode: "quick" | "detailed";
  log_date: string;
}

export interface ProgressEntry {
  progress_id?: string;
  user_id?: string;
  weight: number;
  body_fat_percent?: number;
  height?: number;
  photo_url?: string;
  recorded_at: string;
}

export interface Milestone {
  milestone_id: string;
  user_id: string;
  type: string;
  badge: string;
  achieved_at: string;
}

export interface DashboardSummary {
  greeting: string;             // e.g. "Good morning, Alex."
  date_label: string;           // e.g. "SUN · 31 MAY"
  streak_days: number;
  steps: { value: number; goal: number };
  calories: number;
  water_litres: number;
  today_sessions: Array<{ time: string; name: string; next: boolean; tag?: string }>;
}

export interface Notification {
  notification_id: string;
  recipient_id: string;
  type: string;
  message: string;
  status: "read" | "unread";
  timestamp: string;
}

export interface ApiError {
  status: number;
  detail: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/types.ts
git commit -m "feat: shared API types"
```

### Task 1.3: Fetch wrapper

**Files:**
- Create: `src/api/client.ts`

- [ ] **Step 1: Write the wrapper**

```ts
import type { ApiError } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "onefit-jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;          // default true; pass false for /auth/login etc.
}

export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 501) {
    // AI endpoints currently 501; callers should catch and show "coming soon"
    const err: ApiError = { status: 501, detail: "Not implemented yet" };
    throw err;
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json.detail ?? detail;
    } catch {}
    const err: ApiError = { status: res.status, detail };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: HTTP client with JWT and 501 handling"
```

### Task 1.4: Auth endpoints

**Files:**
- Create: `src/api/auth.ts`

- [ ] **Step 1: Write `src/api/auth.ts`**

```ts
import { request, setToken } from "./client";
import type { AuthResponse, User } from "./types";

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  role: "gym_user" | "wellness_specialist" | "admin";
}): Promise<User> {
  return request<User>("/auth/register", { method: "POST", body: payload, auth: false });
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
  setToken(res.access_token);
  return res;
}

export async function me(): Promise<User> {
  return request<User>("/auth/me");
}

export function logout() {
  setToken(null);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/auth.ts
git commit -m "feat: auth API client"
```

### Task 1.5: Gym User endpoints

**Files:**
- Create: `src/api/gymUser.ts`

- [ ] **Step 1: Write `src/api/gymUser.ts`**

```ts
import { request } from "./client";
import type {
  FitnessProfile,
  WorkoutPlan,
  WorkoutSession,
  ActivityLog,
  DietaryLog,
  ProgressEntry,
  Milestone,
  DashboardSummary,
} from "./types";

export const getProfile = () => request<FitnessProfile>("/gym-user/profile");
export const updateProfile = (p: Partial<FitnessProfile>) =>
  request<FitnessProfile>("/gym-user/profile", { method: "PUT", body: p });

export const getPlans = () => request<WorkoutPlan[]>("/gym-user/plans");
export const createPlan = (p: { goal: string; generated_by?: string }) =>
  request<WorkoutPlan>("/gym-user/plans", { method: "POST", body: p });

export const logActivity = (a: ActivityLog) =>
  request<ActivityLog>("/gym-user/activity", { method: "POST", body: a });

export const logDiet = (d: DietaryLog) =>
  request<DietaryLog>("/gym-user/diet", { method: "POST", body: d });

export const getDashboard = () => request<DashboardSummary>("/gym-user/dashboard");

export const getProgress = () => request<ProgressEntry[]>("/gym-user/progress");
export const logProgress = (e: ProgressEntry) =>
  request<ProgressEntry>("/gym-user/progress", { method: "POST", body: e });

export const getMilestones = () => request<Milestone[]>("/gym-user/milestones");

export const getSessions = () => request<WorkoutSession[]>("/gym-user/sessions");
export const createSession = (s: Omit<WorkoutSession, "session_id" | "status">) =>
  request<WorkoutSession>("/gym-user/sessions", { method: "POST", body: s });
```

- [ ] **Step 2: Commit**

```bash
git add src/api/gymUser.ts
git commit -m "feat: gym-user API client"
```

### Task 1.6: Notifications + AI clients

**Files:**
- Create: `src/api/notifications.ts`
- Create: `src/api/ai.ts`

- [ ] **Step 1: Write `src/api/notifications.ts`**

```ts
import { request } from "./client";
import type { Notification } from "./types";

export const listNotifications = () => request<Notification[]>("/notifications/");
export const markRead = (id: string) =>
  request<void>(`/notifications/${id}/read`, { method: "PATCH" });
```

- [ ] **Step 2: Write `src/api/ai.ts`**

```ts
import { request } from "./client";
import type { WorkoutPlan } from "./types";

// Both endpoints currently 501. Callers catch ApiError with status===501 and show "coming soon".
export const generateWorkoutPlan = (p: { goal: string; days_per_week: number }) =>
  request<WorkoutPlan>("/ai/workout-plan", { method: "POST", body: p });

export interface NutritionResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const searchNutrition = (q: string) =>
  request<NutritionResult[]>(`/ai/nutrition/search?q=${encodeURIComponent(q)}`);
```

- [ ] **Step 3: Commit**

```bash
git add src/api/notifications.ts src/api/ai.ts
git commit -m "feat: notifications and AI API clients"
```

---

## Phase 2 — Auth + routing

Goal: real login/register/logout, redirect rules, JWT persists across reloads.

### Task 2.1: AuthProvider context

**Files:**
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/auth/useAuth.ts`

- [ ] **Step 1: Write `src/auth/AuthProvider.tsx`**

```tsx
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import * as authApi from "../api/auth";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => { throw new Error("AuthProvider missing"); },
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Write `src/auth/useAuth.ts`**

```ts
"use client";
import { useContext } from "react";
import { AuthContext } from "./AuthProvider";

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 3: Wrap layout with provider**

Modify `src/app/layout.tsx`:

```tsx
import "./globals.css";
import { AuthProvider } from "../auth/AuthProvider";

export const metadata = { title: "OneFit", description: "Daily · movement" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/auth src/app/layout.tsx
git commit -m "feat: AuthProvider with JWT persistence"
```

### Task 2.2: Wire LoginScreen to real auth

**Files:**
- Modify: `src/mobile/screens/LoginScreen.jsx`

- [ ] **Step 1: Replace the screen's `onSignIn` with real login**

Open `src/mobile/screens/LoginScreen.jsx`. Replace the entire component with:

```jsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, Label, Field, PrimaryButton } from "../Primitives";
import { useAuth } from "../../auth/useAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("alex@onefit.com");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const user = await login(email, pw);
      if (user.role === "gym_user") router.push("/dashboard");
      else if (user.role === "wellness_specialist") router.push("/specialist/clients");
      else router.push("/admin/dashboard");
    } catch (e) {
      setErr(e.detail || "Invalid email or password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 30px 30px" }}>
      <div style={{ paddingTop: 57 }}>
        <BrandMark />
        <div style={{ marginTop: 14 }}>
          <Label style={{ letterSpacing: "2px" }}>daily · movement</Label>
        </div>
      </div>
      <h1 style={{ margin: "76px 0 0", fontFamily: "var(--font-greeting)", fontWeight: 400, fontSize: 22, letterSpacing: "-0.5px", color: "var(--charcoal)", lineHeight: 1.15 }}>
        Welcome back.
      </h1>
      <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 22 }}>
        <Field label="EMAIL" value={email} onChange={setEmail} />
        <Field label="PASSWORD" value={pw} onChange={setPw} placeholder="••••••••" type="password" />
      </div>
      {err && (
        <div style={{ marginTop: 16, color: "var(--coral)", fontSize: 12 }}>
          {err}
        </div>
      )}
      <div style={{ marginTop: "auto" }}>
        <PrimaryButton onClick={busy ? undefined : submit}>
          {busy ? "Signing in…" : "Sign in  →"}
        </PrimaryButton>
        <div style={{ marginTop: 22, textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--muted)" }}>
          New here?{" "}
          <span style={{ color: "var(--charcoal)", cursor: "pointer" }} onClick={() => router.push("/register")}>
            Join us
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/screens/LoginScreen.jsx
git commit -m "feat: wire LoginScreen to real auth"
```

### Task 2.3: Route guard helper

**Files:**
- Create: `src/auth/RequireAuth.tsx`

- [ ] **Step 1: Write the guard**

```tsx
"use client";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import type { UserRole } from "../api/types";

export function RequireAuth({ children, role }: { children: ReactNode; role?: UserRole }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (role && user.role !== role) {
      router.replace("/login");
    }
  }, [user, loading, role, router]);

  if (loading || !user) return null;
  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/auth/RequireAuth.tsx
git commit -m "feat: RequireAuth route guard"
```

### Task 2.4: Per-screen Next.js routes

Goal: each mobile screen has its own URL so navigation = Next.js routing instead of `useState`.

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/activity/page.tsx`
- Create: `src/app/diet/page.tsx`
- Create: `src/app/milestone/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/app/login/page.tsx`**

```tsx
"use client";
import PhoneFrame from "../../mobile/PhoneFrame";
import LoginScreen from "../../mobile/screens/LoginScreen";

export default function LoginPage() {
  return <PhoneFrame><LoginScreen /></PhoneFrame>;
}
```

- [ ] **Step 2: Create `src/app/dashboard/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import DashboardScreen from "../../mobile/screens/DashboardScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function DashboardPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <DashboardScreen
          onTab={(t) => {
            if (t === "Train") router.push("/activity");
            if (t === "Eat") router.push("/diet");
          }}
        />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 3: Create `src/app/activity/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import LogActivityScreen from "../../mobile/screens/LogActivityScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ActivityPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <LogActivityScreen
          onBack={() => router.back()}
          onSave={() => router.push("/milestone")}
        />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 4: Create `src/app/diet/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import LogDietScreen from "../../mobile/screens/LogDietScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function DietPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <LogDietScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 5: Create `src/app/milestone/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import MilestoneScreen from "../../mobile/screens/MilestoneScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function MilestonePage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame bg="var(--coral)">
        <MilestoneScreen onShare={() => router.push("/dashboard")} />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 6: Update `src/app/page.tsx` to redirect**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, router]);
  return null;
}
```

- [ ] **Step 7: Verify routes work**

```bash
npm run dev
```

Manually click through: `/` should redirect to `/login`. Login → goes to `/dashboard`. Train tab → `/activity`. Save → `/milestone`. Share → `/dashboard`.

- [ ] **Step 8: Commit**

```bash
git add src/app
git commit -m "feat: split mobile screens into Next.js routes"
```

### Task 2.5: Retire old AppShell tweaks toolbar (keep tweaks panel)

The old `AppShell.jsx` used a toolbar to switch screens via local state. Now routes do that. But the **Tweaks panel** (Inter ↔ EB Garamond, accent color) should stay — it's useful for the demo.

**Files:**
- Create: `src/components/TweaksPanel.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `src/AppShell.jsx` after extracting the tweaks panel

- [ ] **Step 1: Extract the Tweaks component into `src/components/TweaksPanel.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

const ACCENTS = [
  { value: "#E85D4A", label: "Coral" },
  { value: "#B94838", label: "Warm red" },
  { value: "#D8732E", label: "Burnt" },
];

export default function TweaksPanel() {
  const [personalBeats, setPersonalBeats] = useState("EB Garamond");
  const [accent, setAccent] = useState("#E85D4A");

  useEffect(() => {
    const serif = personalBeats === "EB Garamond";
    document.documentElement.style.setProperty("--font-greeting", serif ? "var(--font-serif)" : "var(--font-sans)");
    document.documentElement.style.setProperty("--font-numeral", serif ? "var(--font-serif)" : "var(--font-sans)");
  }, [personalBeats]);

  useEffect(() => {
    document.documentElement.style.setProperty("--coral", accent);
  }, [accent]);

  return (
    <div className="tweaks">
      <h4>Typography</h4>
      <div className="row">
        <span>Personal beats</span>
        <div className="seg">
          {["Inter", "EB Garamond"].map((opt) => (
            <button key={opt} className={personalBeats === opt ? "on" : ""} onClick={() => setPersonalBeats(opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <h4>Color</h4>
      <div className="row">
        <span>Accent</span>
        <div className="chips">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              title={a.label}
              className={`chip${accent === a.value ? " on" : ""}`}
              style={{ background: a.value }}
              onClick={() => setAccent(a.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount in root layout**

Modify `src/app/layout.tsx`:

```tsx
import "./globals.css";
import { AuthProvider } from "../auth/AuthProvider";
import TweaksPanel from "../components/TweaksPanel";

export const metadata = { title: "OneFit", description: "Daily · movement" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <TweaksPanel />
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Delete old AppShell**

```bash
git rm src/AppShell.jsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TweaksPanel.tsx src/app/layout.tsx
git commit -m "refactor: extract TweaksPanel, retire AppShell"
```

---

## Phase 3 — Build the 4 missing mobile screens

For each new screen the pattern is: build it with hardcoded data first (so it renders), THEN wire to API (next phase).

### Task 3.1: RegisterScreen (multi-step)

**Files:**
- Create: `src/mobile/screens/RegisterScreen.jsx`
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: Write `src/mobile/screens/RegisterScreen.jsx`**

```jsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, Label, Field, PrimaryButton, Hairline } from "../Primitives";
import { register, login } from "../../api/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    email: "", password: "",
    firstName: "", lastName: "", dob: "",
    height: "", weight: "", gender: "",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await register({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password,
        role: "gym_user",
      });
      await login({ email: form.email, password: form.password });
      router.push("/dashboard");
    } catch (e) {
      setErr(e.detail || "Registration failed");
      setBusy(false);
    }
  };

  const progressPct = (step / 3) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 30px 30px" }}>
      <div style={{ paddingTop: 57 }}>
        <BrandMark />
      </div>
      <div style={{ marginTop: 30 }}>
        <Label>{`Step ${step} of 3 · ${step === 1 ? "Account" : step === 2 ? "About You" : "Body Metrics"}`}</Label>
        <div style={{ marginTop: 12, height: 2, background: "var(--border)", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progressPct}%`, background: "var(--coral)", transition: "width .3s ease" }} />
        </div>
      </div>

      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 22 }}>
        {step === 1 && (
          <>
            <Field label="EMAIL" value={form.email} onChange={set("email")} />
            <Field label="PASSWORD" value={form.password} onChange={set("password")} type="password" placeholder="••••••••" />
          </>
        )}
        {step === 2 && (
          <>
            <Field label="FIRST NAME" value={form.firstName} onChange={set("firstName")} />
            <Field label="LAST NAME" value={form.lastName} onChange={set("lastName")} />
            <Field label="DATE OF BIRTH" value={form.dob} onChange={set("dob")} placeholder="YYYY-MM-DD" />
            <Field label="GENDER" value={form.gender} onChange={set("gender")} placeholder="e.g. female" />
          </>
        )}
        {step === 3 && (
          <>
            <Field label="HEIGHT (CM)" value={form.height} onChange={set("height")} />
            <Field label="WEIGHT (KG)" value={form.weight} onChange={set("weight")} />
          </>
        )}
      </div>

      {err && <div style={{ marginTop: 16, color: "var(--coral)", fontSize: 12 }}>{err}</div>}

      <div style={{ marginTop: "auto" }}>
        <PrimaryButton onClick={busy ? undefined : (step < 3 ? () => setStep(step + 1) : submit)}>
          {busy ? "Creating account…" : (step < 3 ? "Continue  →" : "Create account  →")}
        </PrimaryButton>
        <div style={{ marginTop: 22, textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--muted)" }}>
          Already have an account?{" "}
          <span style={{ color: "var(--charcoal)", cursor: "pointer" }} onClick={() => router.push("/login")}>Sign in</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/register/page.tsx`**

```tsx
"use client";
import PhoneFrame from "../../mobile/PhoneFrame";
import RegisterScreen from "../../mobile/screens/RegisterScreen";

export default function RegisterPage() {
  return <PhoneFrame><RegisterScreen /></PhoneFrame>;
}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`, visit `/register`. Step through 1 → 2 → 3, click Create account. Without backend running, you'll see the registration error — that's expected; we verify the wire works.

- [ ] **Step 4: Commit**

```bash
git add src/mobile/screens/RegisterScreen.jsx src/app/register
git commit -m "feat: RegisterScreen (3-step)"
```

### Task 3.2: CreatePlanScreen

**Files:**
- Create: `src/mobile/screens/CreatePlanScreen.jsx`
- Create: `src/app/plan/page.tsx`

- [ ] **Step 1: Write `src/mobile/screens/CreatePlanScreen.jsx`**

```jsx
"use client";
import React, { useState } from "react";
import { ScreenHeader, Label, Hairline, PrimaryButton } from "../Primitives";
import { createPlan } from "../../api/gymUser";
import { generateWorkoutPlan } from "../../api/ai";

const GOALS = ["Lose fat", "Build muscle", "Endurance", "Maintain"];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function CreatePlanScreen({ onBack, onSaved }) {
  const [goal, setGoal] = useState("Lose fat");
  const [days, setDays] = useState([true, false, true, false, true, false, false]);
  const [busy, setBusy] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [err, setErr] = useState("");

  const toggleDay = (i) => {
    setDays((d) => d.map((v, idx) => (idx === i ? !v : v)));
  };

  const generate = async () => {
    setErr(""); setBusy(true); setComingSoon(false);
    try {
      await generateWorkoutPlan({ goal, days_per_week: days.filter(Boolean).length });
      onSaved?.();
    } catch (e) {
      if (e.status === 501) {
        setComingSoon(true);
      } else {
        setErr(e.detail || "Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const saveManual = async () => {
    setErr(""); setBusy(true);
    try {
      await createPlan({ goal, generated_by: "manual" });
      onSaved?.();
    } catch (e) {
      setErr(e.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="New plan" onBack={onBack} />
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Goal</Label>
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {GOALS.map((g) => {
            const active = g === goal;
            return (
              <button key={g} onClick={() => setGoal(g)}
                style={{
                  height: 36, padding: "0 16px",
                  background: active ? "var(--charcoal)" : "var(--white)",
                  color: active ? "var(--cream)" : "var(--charcoal)",
                  border: active ? "1px solid var(--charcoal)" : "1px solid var(--border)",
                  fontFamily: "var(--font-sans)", fontWeight: active ? 600 : 400, fontSize: 12,
                  cursor: "pointer",
                }}>{g}</button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Training days</Label>
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          {DAYS.map((d, i) => (
            <button key={i} onClick={() => toggleDay(i)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: days[i] ? "var(--coral)" : "transparent",
                color: days[i] ? "var(--charcoal)" : "var(--muted)",
                border: days[i] ? "1px solid var(--coral)" : "1px solid var(--border)",
                fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 12,
                cursor: "pointer",
              }}>{d}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>AI-curated for you</Label>
        <div style={{ marginTop: 12 }}>
          <Hairline />
          {[
            { name: "Warm-up", dur: "8 min" },
            { name: "Push-ups · 3 × 12", dur: "10 min" },
            { name: "Squats · 3 × 15", dur: "12 min" },
            { name: "Plank intervals", dur: "6 min" },
            { name: "Cool-down stretch", dur: "5 min" },
          ].map((ex) => (
            <div key={ex.name} style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "16px 0", borderBottom: "1px solid var(--border)",
              fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)"
            }}>
              <span>{ex.name}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{ex.dur}</span>
            </div>
          ))}
        </div>
      </div>

      {comingSoon && (
        <div style={{ padding: "20px 30px 0", color: "var(--muted)", fontSize: 12 }}>
          AI plan generation coming soon. You can save this plan manually for now.
        </div>
      )}
      {err && (
        <div style={{ padding: "20px 30px 0", color: "var(--coral)", fontSize: 12 }}>{err}</div>
      )}

      <div style={{ marginTop: "auto", padding: "20px 30px 30px", display: "flex", flexDirection: "column", gap: 12 }}>
        <PrimaryButton onClick={busy ? undefined : (comingSoon ? saveManual : generate)}>
          {busy ? "Working…" : (comingSoon ? "Save plan" : "Generate plan ✨")}
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/plan/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import CreatePlanScreen from "../../mobile/screens/CreatePlanScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function PlanPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <CreatePlanScreen onBack={() => router.back()} onSaved={() => router.push("/dashboard")} />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/screens/CreatePlanScreen.jsx src/app/plan
git commit -m "feat: CreatePlanScreen with AI 501 fallback"
```

### Task 3.3: ProfileScreen

**Files:**
- Create: `src/mobile/screens/ProfileScreen.jsx`
- Create: `src/app/profile/page.tsx`

- [ ] **Step 1: Write `src/mobile/screens/ProfileScreen.jsx`**

```jsx
"use client";
import React, { useEffect, useState } from "react";
import { ScreenHeader, Label, Field, Hairline, PrimaryButton } from "../Primitives";
import { getProfile, updateProfile } from "../../api/gymUser";
import { me } from "../../api/auth";

export default function ProfileScreen({ onBack }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ height: "", weight: "", body_fat_percent: "", fitness_goal: "", age: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    me().then(setUser).catch(() => {});
    getProfile().then((p) => setProfile({
      height: String(p.height ?? ""),
      weight: String(p.weight ?? ""),
      body_fat_percent: String(p.body_fat_percent ?? ""),
      fitness_goal: p.fitness_goal ?? "",
      age: String(p.age ?? ""),
    })).catch(() => {});
  }, []);

  const set = (k) => (v) => setProfile((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setMsg(""); setBusy(true);
    try {
      const payload = {
        age: Number(profile.age) || undefined,
        height: Number(profile.height) || undefined,
        weight: Number(profile.weight) || undefined,
        body_fat_percent: Number(profile.body_fat_percent) || undefined,
        fitness_goal: profile.fitness_goal,
      };
      await updateProfile(payload);
      setMsg("Saved.");
    } catch (e) {
      setMsg(e.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const initial = (user?.name?.[0] ?? "A").toUpperCase();
  const bmi = profile.height && profile.weight
    ? (Number(profile.weight) / ((Number(profile.height) / 100) ** 2)).toFixed(1)
    : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="Profile" onBack={onBack} />
      </div>

      <div style={{ padding: "28px 30px 0", display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid var(--charcoal)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-greeting)", fontSize: 22, color: "var(--charcoal)" }}>
          {initial}
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-greeting)", fontSize: 20, color: "var(--charcoal)" }}>
            {user?.name || "—"}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
            {user?.email || ""}
          </div>
        </div>
      </div>

      <div style={{ padding: "30px 30px 0" }}>
        <Label>Body metrics</Label>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
          <Field label="HEIGHT (CM)" value={profile.height} onChange={set("height")} />
          <Field label="WEIGHT (KG)" value={profile.weight} onChange={set("weight")} />
          <Field label="BODY FAT %" value={profile.body_fat_percent} onChange={set("body_fat_percent")} />
          <div>
            <Label>BMI</Label>
            <div style={{ marginTop: 12, marginBottom: 14, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
              {bmi}
            </div>
            <Hairline />
          </div>
        </div>
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Goals</Label>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
          <Field label="FITNESS GOAL" value={profile.fitness_goal} onChange={set("fitness_goal")} />
          <Field label="AGE" value={profile.age} onChange={set("age")} />
        </div>
      </div>

      {msg && <div style={{ padding: "16px 30px 0", color: msg === "Saved." ? "var(--muted)" : "var(--coral)", fontSize: 12 }}>{msg}</div>}

      <div style={{ marginTop: "auto", padding: "0 30px 30px" }}>
        <PrimaryButton onClick={busy ? undefined : save}>
          {busy ? "Saving…" : "Save changes"}
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/profile/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import ProfileScreen from "../../mobile/screens/ProfileScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProfilePage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <ProfileScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/screens/ProfileScreen.jsx src/app/profile
git commit -m "feat: ProfileScreen with live profile fetch + save"
```

### Task 3.4: UpdateProgressScreen

**Files:**
- Create: `src/mobile/screens/UpdateProgressScreen.jsx`
- Create: `src/app/progress/page.tsx`

- [ ] **Step 1: Write `src/mobile/screens/UpdateProgressScreen.jsx`**

```jsx
"use client";
import React, { useEffect, useState } from "react";
import { ScreenHeader, Label, Field, Hairline, PrimaryButton } from "../Primitives";
import { getProgress, logProgress, getMilestones } from "../../api/gymUser";

function BarChart({ data, height = 110 }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: "100%", height: `${(d.v / max) * 100}%`, background: isLast ? "var(--coral)" : "var(--border)" }} />
            <Label>{d.label}</Label>
          </div>
        );
      })}
    </div>
  );
}

export default function UpdateProgressScreen({ onBack }) {
  const [entries, setEntries] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = async () => {
    try { setEntries(await getProgress()); } catch {}
    try { setMilestones(await getMilestones()); } catch {}
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    setMsg(""); setBusy(true);
    try {
      await logProgress({
        weight: Number(weight),
        body_fat_percent: bodyFat ? Number(bodyFat) : undefined,
        recorded_at: new Date().toISOString(),
      });
      setWeight(""); setBodyFat("");
      await refresh();
      setMsg("Saved.");
    } catch (e) {
      setMsg(e.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...entries].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];
  const delta = latest && earliest ? (earliest.weight - latest.weight).toFixed(1) : "0.0";
  const chartData = sorted.slice(-6).map((e, i, arr) => ({
    v: e.weight,
    label: `W${17 + i}`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="Your progress" onBack={onBack} />
      </div>

      <div style={{ padding: "28px 30px 0" }}>
        <Label>Current weight</Label>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-numeral)", fontWeight: 700, fontSize: 36, color: "var(--charcoal)" }}>
            {latest?.weight ?? "—"}
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>kg</span>
        </div>
        {Number(delta) > 0 && (
          <div style={{ marginTop: 8 }}>
            <Label color="var(--coral)" style={{ letterSpacing: "1px" }}>↓ {delta} KG THIS MONTH</Label>
          </div>
        )}
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        {chartData.length > 0 && <BarChart data={chartData} />}
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Log new measurements</Label>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
          <Field label="WEIGHT (KG)" value={weight} onChange={setWeight} />
          <Field label="BODY FAT %" value={bodyFat} onChange={setBodyFat} />
        </div>
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>Recent milestones</Label>
        <div style={{ marginTop: 12 }}>
          <Hairline />
          {milestones.length === 0 && (
            <div style={{ padding: "16px 0", fontSize: 12, color: "var(--muted)" }}>
              Log your first measurement to start earning badges.
            </div>
          )}
          {milestones.map((m) => (
            <div key={m.milestone_id} style={{ padding: "14px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{m.badge}</span>
              <Label>{new Date(m.achieved_at).toLocaleDateString()}</Label>
            </div>
          ))}
        </div>
      </div>

      {msg && <div style={{ padding: "16px 30px 0", color: msg === "Saved." ? "var(--muted)" : "var(--coral)", fontSize: 12 }}>{msg}</div>}

      <div style={{ marginTop: "auto", padding: "20px 30px 30px" }}>
        <PrimaryButton onClick={busy || !weight ? undefined : save}>
          {busy ? "Saving…" : "Save progress"}
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/progress/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import UpdateProgressScreen from "../../mobile/screens/UpdateProgressScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function ProgressPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <UpdateProgressScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/screens/UpdateProgressScreen.jsx src/app/progress
git commit -m "feat: UpdateProgressScreen with chart + log form"
```

### Task 3.5: CalendarScreen

**Files:**
- Create: `src/mobile/screens/CalendarScreen.jsx`
- Create: `src/app/calendar/page.tsx`

- [ ] **Step 1: Write `src/mobile/screens/CalendarScreen.jsx`**

```jsx
"use client";
import React, { useEffect, useState } from "react";
import { ScreenHeader, Label, Hairline, PrimaryButton } from "../Primitives";
import { getSessions } from "../../api/gymUser";

function MonthGrid({ year, month, sessions }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayMatch = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1;
  const scheduledDays = new Set(
    sessions
      .map((s) => new Date(s.scheduled_date))
      .filter((d) => d.getFullYear() === year && d.getMonth() === month)
      .map((d) => d.getDate())
  );

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <Label key={i} style={{ textAlign: "center" }}>{d}</Label>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const isToday = d === todayMatch;
          const hasSession = scheduledDays.has(d);
          return (
            <div key={i} style={{
              aspectRatio: "1 / 1", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              background: isToday ? "var(--charcoal)" : "transparent",
              color: isToday ? "var(--cream)" : "var(--charcoal)",
              fontFamily: "var(--font-sans)", fontSize: 13,
            }}>
              <span>{d}</span>
              {hasSession && <span style={{ width: 4, height: 4, borderRadius: "50%", background: isToday ? "var(--cream)" : "var(--coral)" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarScreen({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => { getSessions().then(setSessions).catch(() => {}); }, []);

  const upcoming = [...sessions]
    .filter((s) => new Date(`${s.scheduled_date}T${s.scheduled_time}`) >= new Date())
    .sort((a, b) => new Date(`${a.scheduled_date}T${a.scheduled_time}`) - new Date(`${b.scheduled_date}T${b.scheduled_time}`))
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="Schedule" onBack={onBack} />
      </div>

      <div style={{ padding: "26px 30px 0" }}>
        <Label>{`${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}</Label>
        <div style={{ marginTop: 18 }}>
          <MonthGrid year={cursor.getFullYear()} month={cursor.getMonth()} sessions={sessions} />
        </div>
      </div>

      <div style={{ padding: "30px 30px 0" }}>
        <Label>Up next</Label>
        <div style={{ marginTop: 12 }}>
          <Hairline />
          {upcoming.length === 0 && (
            <div style={{ padding: "16px 0", fontSize: 12, color: "var(--muted)" }}>
              No sessions scheduled yet.
            </div>
          )}
          {upcoming.map((s) => (
            <div key={s.session_id} style={{ padding: "14px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, color: "var(--charcoal)" }}>{s.scheduled_date.slice(5)}</span>
              <Label>{s.scheduled_time}</Label>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "20px 30px 30px" }}>
        <PrimaryButton variant="outline" onClick={() => alert("New-session UI is a follow-up.")}>
          + New session
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/calendar/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import PhoneFrame from "../../mobile/PhoneFrame";
import CalendarScreen from "../../mobile/screens/CalendarScreen";
import { RequireAuth } from "../../auth/RequireAuth";

export default function CalendarPage() {
  const router = useRouter();
  return (
    <RequireAuth role="gym_user">
      <PhoneFrame>
        <CalendarScreen onBack={() => router.back()} />
      </PhoneFrame>
    </RequireAuth>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/screens/CalendarScreen.jsx src/app/calendar
git commit -m "feat: CalendarScreen with month grid + upcoming sessions"
```

---

## Phase 4 — Wire existing screens to API

The 5 existing screens (Dashboard, LogActivity, LogDiet, Milestone, Login already done) currently use hardcoded data. Replace with API calls.

### Task 4.1: Wire DashboardScreen to /gym-user/dashboard

**Files:**
- Modify: `src/mobile/screens/DashboardScreen.jsx`

- [ ] **Step 1: Fetch dashboard summary on mount**

Open `src/mobile/screens/DashboardScreen.jsx`. Add at the top of the file (after the existing imports):

```jsx
import { useEffect, useState } from "react";
import { getDashboard } from "../../api/gymUser";
```

Inside `DashboardScreen({ onTab })`, replace the hardcoded greeting/streak/stats/sessions with state-driven content:

```jsx
const [data, setData] = useState(null);

useEffect(() => {
  getDashboard().then(setData).catch(() => {});
}, []);

const dashboard = data ?? {
  greeting: "Good morning.",
  date_label: "TODAY",
  streak_days: 0,
  steps: { value: 0, goal: 10000 },
  calories: 0,
  water_litres: 0,
  today_sessions: [],
};
```

Then change the JSX:

- `SUN · 31 MAY` → `{dashboard.date_label}`
- `9-Day Streak` → `{`${dashboard.streak_days}-Day Streak`}`
- `Good morning, Alex.` → `{dashboard.greeting}`
- StatRow values → `{dashboard.steps.value.toLocaleString()}` etc., `pct={dashboard.steps.value / dashboard.steps.goal}`
- Today rows → `dashboard.today_sessions.map((s) => <WorkoutRow key={s.time} {...s} isNext={s.next} />)`

- [ ] **Step 2: Manual verify**

Run `npm run dev`. With backend up, dashboard shows real data. Without backend, falls back to the empty defaults gracefully.

- [ ] **Step 3: Commit**

```bash
git add src/mobile/screens/DashboardScreen.jsx
git commit -m "feat: wire DashboardScreen to /gym-user/dashboard"
```

### Task 4.2: Wire LogActivityScreen to POST /gym-user/activity

**Files:**
- Modify: `src/mobile/screens/LogActivityScreen.jsx`

- [ ] **Step 1: Replace `onSave` placeholder with real API call**

At the top of the file add:

```jsx
import { logActivity } from "../../api/gymUser";
```

Add state inside the component:

```jsx
const [duration, setDuration] = useState("35");
const [feel, setFeel] = useState("Moderate intensity");
const [notes, setNotes] = useState("Morning loop at the lake…");
const [busy, setBusy] = useState(false);
const [err, setErr] = useState("");
```

Replace the Duration `Field` to use state (instead of hardcoded "35 minutes"):

```jsx
<Field label="DURATION" value={`${duration} minutes`} onChange={(v) => setDuration(v.replace(/\D/g, ""))} />
```

Replace the `PrimaryButton`'s `onClick`:

```jsx
<PrimaryButton onClick={busy ? undefined : async () => {
  setBusy(true); setErr("");
  try {
    await logActivity({
      workout_type: activity,
      duration: Number(duration) || 0,
      source: "manual",
      log_date: new Date().toISOString().slice(0, 10),
    });
    onSave?.();
  } catch (e) {
    setErr(e.detail || "Save failed");
  } finally {
    setBusy(false);
  }
}}>{busy ? "Saving…" : "Save entry"}</PrimaryButton>
```

Add error display above the button:

```jsx
{err && <div style={{ padding: "0 30px 12px", color: "var(--coral)", fontSize: 12 }}>{err}</div>}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/screens/LogActivityScreen.jsx
git commit -m "feat: wire LogActivityScreen to /gym-user/activity"
```

### Task 4.3: Wire LogDietScreen — add meal form + POST /gym-user/diet

The current LogDietScreen only displays meals; "+ Add meal" doesn't do anything. Build a simple add-meal inline form.

**Files:**
- Modify: `src/mobile/screens/LogDietScreen.jsx`

- [ ] **Step 1: Add state + fetch existing logs**

At top of file add imports:

```jsx
import { useEffect, useState } from "react";
import { logDiet } from "../../api/gymUser";
import { Field } from "../Primitives";
```

Inside the component, add:

```jsx
const [adding, setAdding] = useState(false);
const [form, setForm] = useState({ meal_time: "snack", food_item: "", calories: "" });
const [busy, setBusy] = useState(false);
const [err, setErr] = useState("");

const submitMeal = async () => {
  setErr(""); setBusy(true);
  try {
    await logDiet({
      meal_time: form.meal_time,
      food_item: form.food_item,
      calories: Number(form.calories) || 0,
      entry_mode: "quick",
      log_date: new Date().toISOString().slice(0, 10),
    });
    setForm({ meal_time: "snack", food_item: "", calories: "" });
    setAdding(false);
  } catch (e) {
    setErr(e.detail || "Save failed");
  } finally {
    setBusy(false);
  }
};
```

Replace the "+ Add meal" `PrimaryButton` onClick handler with `() => setAdding(true)`, and add an inline form above it (when `adding`):

```jsx
{adding && (
  <div style={{ padding: "12px 30px 0", display: "flex", flexDirection: "column", gap: 14 }}>
    <Field label="FOOD" value={form.food_item} onChange={(v) => setForm({ ...form, food_item: v })} placeholder="e.g. Apple" />
    <Field label="CALORIES" value={form.calories} onChange={(v) => setForm({ ...form, calories: v.replace(/\D/g, "") })} />
    <div style={{ display: "flex", gap: 10 }}>
      {["breakfast","lunch","dinner","snack"].map((m) => (
        <button key={m} onClick={() => setForm({ ...form, meal_time: m })}
          style={{
            flex: 1, height: 36,
            background: form.meal_time === m ? "var(--charcoal)" : "transparent",
            color: form.meal_time === m ? "var(--cream)" : "var(--charcoal)",
            border: form.meal_time === m ? "1px solid var(--charcoal)" : "1px solid var(--border)",
            fontFamily: "var(--font-sans)", fontWeight: form.meal_time === m ? 600 : 400, fontSize: 11,
            textTransform: "capitalize", cursor: "pointer",
          }}>{m}</button>
      ))}
    </div>
    {err && <div style={{ color: "var(--coral)", fontSize: 12 }}>{err}</div>}
    <PrimaryButton onClick={busy ? undefined : submitMeal}>
      {busy ? "Saving…" : "Save meal"}
    </PrimaryButton>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/screens/LogDietScreen.jsx
git commit -m "feat: wire LogDietScreen Add-meal inline form to /gym-user/diet"
```

### Task 4.4: Add Logout to DashboardScreen header

**Files:**
- Modify: `src/mobile/screens/DashboardScreen.jsx`

- [ ] **Step 1: Add logout on avatar click**

At top:

```jsx
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/useAuth";
```

In the component:

```jsx
const router = useRouter();
const { logout } = useAuth();
```

Make the avatar `<div>` clickable:

```jsx
<div onClick={() => { logout(); router.push("/login"); }} style={{ ...avatarStyle, cursor: "pointer" }} title="Sign out">A</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/mobile/screens/DashboardScreen.jsx
git commit -m "feat: tap avatar to sign out"
```

---

## Phase 5 — Required UX polish

Things explicitly called out in SRS/SDS that you can knock off now.

### Task 5.1: Calorie ring chart on Log Diet

The SRS NFR explicitly says "diet diary visualises daily progress with a **dynamic ring chart**." Right now we have linear macro bars. Add a single SVG donut over the calorie total.

**Files:**
- Create: `src/mobile/components/CalorieRing.jsx`
- Modify: `src/mobile/screens/LogDietScreen.jsx`

- [ ] **Step 1: Write `src/mobile/components/CalorieRing.jsx`**

```jsx
"use client";
import React from "react";

export default function CalorieRing({ value, goal, size = 96, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / goal);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--coral)" strokeWidth={stroke}
        strokeDasharray={`${c * pct} ${c}`}
        strokeDashoffset={c * 0.25}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .6s ease" }}
      />
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: "var(--font-numeral)", fontWeight: 700, fontSize: 18, fill: "var(--charcoal)" }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Replace the big "1,840" number block in `LogDietScreen.jsx` with a row containing the number AND the ring**

Find the block that shows the intake total and rewrite it as:

```jsx
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
  <div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontFamily: "var(--font-numeral)", fontWeight: 700, fontSize: 28, color: "var(--charcoal)", lineHeight: 1 }}>
        1,840
      </span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)" }}>/ 1,850 kcal</span>
    </div>
  </div>
  <CalorieRing value={1840} goal={1850} />
</div>
```

(When LogDiet is wired to real data in Task 4.3 follow-up, pass real values in.)

Import the ring at top:

```jsx
import CalorieRing from "../components/CalorieRing";
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/components/CalorieRing.jsx src/mobile/screens/LogDietScreen.jsx
git commit -m "feat: dynamic calorie ring on Log Diet"
```

### Task 5.2: Numeric input validation

SRS NFR 5.3: "Numeric input fields (weight, calories, sets, reps) reject letters and show validation error before save."

**Files:**
- Modify: `src/mobile/Primitives.jsx`

- [ ] **Step 1: Add a `numeric` prop to `Field`**

In `Field`, add the prop and use it:

```jsx
export function Field({ label, value, placeholder, onChange, type = "text", caret, numeric }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : undefined}
        onChange={
          onChange
            ? (e) => {
                let v = e.target.value;
                if (numeric) v = v.replace(/[^0-9.]/g, "");
                onChange(v);
              }
            : undefined
        }
        readOnly={!onChange}
        style={{ /* unchanged */ }}
      />
      <Hairline />
    </div>
  );
}
```

(Copy the existing `style={...}` block — don't change it.)

- [ ] **Step 2: Apply `numeric` to the right fields**

In `ProfileScreen.jsx`, `UpdateProgressScreen.jsx`, `RegisterScreen.jsx` (height/weight), and `LogActivityScreen.jsx` (duration if you use a Field there), add the `numeric` prop:

```jsx
<Field label="HEIGHT (CM)" value={form.height} onChange={set("height")} numeric />
<Field label="WEIGHT (KG)" value={form.weight} onChange={set("weight")} numeric />
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/Primitives.jsx src/mobile/screens
git commit -m "feat: numeric-only Field with inputMode=decimal"
```

### Task 5.3: Health disclaimer modal on first plan generation

**Files:**
- Create: `src/mobile/components/HealthDisclaimerModal.jsx`
- Modify: `src/mobile/screens/CreatePlanScreen.jsx`

- [ ] **Step 1: Write `src/mobile/components/HealthDisclaimerModal.jsx`**

```jsx
"use client";
import React from "react";
import { PrimaryButton, Label } from "../Primitives";

export default function HealthDisclaimerModal({ onAgree, onCancel }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end", zIndex: 60,
    }}>
      <div style={{ width: "100%", background: "var(--cream)", padding: "26px 24px 24px" }}>
        <Label>Before you start</Label>
        <div style={{ marginTop: 12, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)", lineHeight: 1.5 }}>
          OneFit's AI-generated plans are guidance, not medical advice. Consult a certified medical professional before starting any new training or diet plan.
        </div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <PrimaryButton onClick={onAgree}>I understand</PrimaryButton>
          <button onClick={onCancel} style={{
            background: "transparent", border: "none",
            fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted)",
            cursor: "pointer", padding: 8,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Gate the generate button in `CreatePlanScreen.jsx`**

Add state:

```jsx
const [askedDisclaimer, setAskedDisclaimer] = useState(false);
const [showDisclaimer, setShowDisclaimer] = useState(false);
```

Replace the generate button's `onClick`:

```jsx
onClick={busy ? undefined : (comingSoon ? saveManual : () => {
  if (askedDisclaimer) return generate();
  setShowDisclaimer(true);
})}
```

Render the modal:

```jsx
{showDisclaimer && (
  <HealthDisclaimerModal
    onAgree={() => { setAskedDisclaimer(true); setShowDisclaimer(false); generate(); }}
    onCancel={() => setShowDisclaimer(false)}
  />
)}
```

Import at top:

```jsx
import HealthDisclaimerModal from "../components/HealthDisclaimerModal";
```

- [ ] **Step 3: Commit**

```bash
git add src/mobile/components/HealthDisclaimerModal.jsx src/mobile/screens/CreatePlanScreen.jsx
git commit -m "feat: health disclaimer modal on first plan generation"
```

### Task 5.4: Bottom-tab navigation everywhere

Currently only Dashboard has the bottom tabs. Add it to LogActivity, LogDiet, Progress (and so on) so users always have nav.

**Files:**
- Create: `src/mobile/TabBar.jsx`
- Modify: `src/mobile/screens/DashboardScreen.jsx` (extract its existing TabBar)

- [ ] **Step 1: Extract `TabBar` into `src/mobile/TabBar.jsx`**

```jsx
"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";

const TABS = [
  { id: "Home", path: "/dashboard" },
  { id: "Train", path: "/activity" },
  { id: "Eat", path: "/diet" },
  { id: "Stats", path: "/progress" },
];

export default function TabBar() {
  const router = useRouter();
  const path = usePathname();
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "14px 36px 22px",
      borderTop: "1px solid var(--border)",
      background: "var(--cream)",
    }}>
      {TABS.map((t) => {
        const active = path === t.path;
        return (
          <div key={t.id} onClick={() => router.push(t.path)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: active ? "var(--coral)" : "transparent" }} />
            <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: active ? "var(--coral)" : "var(--muted)" }}>
              {t.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update `DashboardScreen.jsx` to use the shared TabBar**

Remove the inline `TabBar` definition. Import the shared one:

```jsx
import TabBar from "../TabBar";
```

Replace `<TabBar active="Home" onTab={onTab} />` with `<TabBar />`. Remove the `onTab` prop from `DashboardScreen` entirely.

- [ ] **Step 3: Append `<TabBar />` to LogActivity, LogDiet, UpdateProgress**

Each of these screens has `marginTop: "auto"` followed by a footer button. Add a `<TabBar />` *below* that bottom button (so it's at the very bottom of the phone screen).

Example for `LogActivityScreen.jsx`:

```jsx
import TabBar from "../TabBar";

// ...at the bottom replace:
<div style={{ marginTop: "auto", padding: "0 30px 30px" }}>
  <PrimaryButton onClick={...}>Save entry</PrimaryButton>
</div>

// with:
<div style={{ marginTop: "auto" }}>
  <div style={{ padding: "0 30px 16px" }}>
    <PrimaryButton onClick={...}>Save entry</PrimaryButton>
  </div>
  <TabBar />
</div>
```

Repeat for `LogDietScreen.jsx` and `UpdateProgressScreen.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/mobile/TabBar.jsx src/mobile/screens
git commit -m "feat: shared TabBar across mobile screens"
```

### Task 5.5: Loading + empty states audit

For each screen that fetches data, verify it doesn't flash an empty layout on load.

- [ ] **Step 1: For each of Dashboard, Profile, Progress, Calendar:** wrap initial render in a "Loading…" state.

Pattern for each screen (Dashboard example):

```jsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  getDashboard().then(setData).catch(() => {}).finally(() => setLoading(false));
}, []);

if (loading) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
      Loading…
    </div>
  );
}
```

Apply this pattern to Dashboard, Profile, Progress, Calendar.

- [ ] **Step 2: Commit**

```bash
git add src/mobile/screens
git commit -m "feat: loading states on data-fetching screens"
```

---

## Phase 6 — Demo polish

### Task 6.1: Landing redirect by role

`src/app/page.tsx` currently sends everyone to /dashboard. Branch by role.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update redirect logic**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "gym_user") router.replace("/dashboard");
    else if (user.role === "wellness_specialist") router.replace("/specialist/clients"); // Plan B
    else if (user.role === "admin") router.replace("/admin/dashboard");                  // Plan B
  }, [user, loading, router]);
  return null;
}
```

(`/specialist/*` and `/admin/*` routes will exist in Plan B; for now the redirect just sits there harmlessly.)

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: role-based landing redirect"
```

### Task 6.2: README walkthrough for the demo

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# OneFit Frontend

The OneFit mobile app + web dashboards. Built with Next.js + React, talks to the FastAPI backend over HTTP/JSON.

## Setup

```bash
npm install
cp .env.example .env.local      # edit if backend isn't on localhost:8000
npm run dev                      # http://localhost:3000
```

Start Wong's FastAPI backend in parallel (see Foundation branch).

## Routes

| Route | Screen |
|---|---|
| `/login` | Sign in |
| `/register` | 3-step registration |
| `/dashboard` | Gym User home |
| `/activity` | Log activity |
| `/diet` | Log diet |
| `/plan` | Create workout plan (AI = coming soon) |
| `/profile` | Edit fitness profile |
| `/progress` | Update body measurements |
| `/calendar` | Schedule sessions |
| `/milestone` | Celebration screen |

## Demo flow

1. Visit `/register` → step through 1 → 2 → 3 → Create account.
2. Lands on `/dashboard`. Tap avatar to sign out.
3. Tap **Train** → `/activity` → fill duration → Save entry → Milestone screen → Share → back to dashboard.
4. Tap **Eat** → `/diet` → "+ Add meal" → fill in → Save.
5. Visit `/plan` → choose goal + days → Generate plan → "AI coming soon" → Save plan manually.
6. Visit `/profile`, `/progress`, `/calendar` for the rest.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with setup + demo walkthrough"
```

---

## Self-review checklist (run before declaring done)

- [ ] Phase 0 — Next.js boots, all old screens render at `/`.
- [ ] Phase 1 — `src/api/` has client, types, auth, gymUser, notifications, ai.
- [ ] Phase 2 — Login redirects by role; refresh keeps you signed in; route guards redirect anonymous users.
- [ ] Phase 3 — Register / Plan / Profile / Progress / Calendar all reachable via URL and render.
- [ ] Phase 4 — Dashboard pulls live summary; LogActivity / LogDiet POST to backend.
- [ ] Phase 5 — Calorie ring renders, numeric inputs reject letters, disclaimer modal blocks first plan generation, TabBar visible on all bottom-anchored screens.
- [ ] Phase 6 — `/` redirects to right home per role; README walks the demo.
- [ ] Manual smoke test with backend off: every page either loads with empty state or shows a graceful error — nothing crashes.
- [ ] Manual smoke test with backend on: full flow Register → Dashboard → Train → Save → Milestone works end-to-end.

---

## What's NOT in this plan (Plan B)

These get their own plan once Plan A ships:

- **Wellness Specialist web routes** (`/specialist/clients`, `/specialist/clients/[id]`, `/specialist/plans/new`) — wire the existing `src/web/screens/Client*.jsx` and `CreateMealPlan.jsx` into Next.js routes, add `RequireAuth role="wellness_specialist"`, and connect to `/wellness-specialist/*` endpoints.
- **Admin web routes** (`/admin/dashboard`, `/admin/users`, `/admin/content`) — same drill with the existing `src/web/screens/Admin*.jsx`. Wire to `/admin/*`. Add **2FA challenge screen** on admin login (SRS NFR 5.2).
- **Offline activity-log queue** (IndexedDB + sync on reconnect).
- **Share Progress branded graphic** (Canvas → PNG export → Web Share API).
- **Supabase Realtime push** for live notifications instead of polling.
- **Vercel deployment** (Vercel project, env vars, CI).
