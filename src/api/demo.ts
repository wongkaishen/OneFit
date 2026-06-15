// Demo-mode fixtures. Activated via ?demo=1 (persisted in localStorage).
// Used by src/api/client.ts to short-circuit every request and return realistic
// seed data instead of hitting Wong's FastAPI.

import type {
  ApiError,
  AuthResponse,
  DashboardSummary,
  FitnessProfile,
  Milestone,
  ProgressEntry,
  User,
  UserRole,
  WorkoutSession,
} from "./types";
import { getDemoRole } from "./client";

export const DEMO_USER: User = {
  user_id: "demo-user-1",
  name: "Alex Tan",
  email: "alex@onefit.com",
  role: "gym_user",
  status: "active",
  created_at: "2026-01-15T08:00:00Z",
};

// Per-role identities so ?demo=specialist / ?demo=admin land on the right shell.
const DEMO_IDENTITY: Record<string, { name: string; email: string }> = {
  gym_user: { name: "Alex Tan", email: "alex@onefit.com" },
  wellness_specialist: { name: "Jordan Mills", email: "jordan@onefit.com" },
  admin: { name: "Sam Reyes", email: "sam@onefit.com" },
};

function demoUser(): User {
  const role = getDemoRole() as UserRole;
  const id = DEMO_IDENTITY[role] ?? DEMO_IDENTITY.gym_user;
  return { ...DEMO_USER, role, name: id.name, email: id.email };
}

const DEMO_PROFILE: FitnessProfile = {
  user_id: DEMO_USER.user_id,
  age: 24,
  height: 170,
  weight: 68,
  body_fat_percent: 18,
  fitness_goal: "Lose fat",
};

const DEMO_DASHBOARD: DashboardSummary = {
  greeting: "Good morning, Alex.",
  date_label: "TODAY",
  streak_days: 9,
  steps: { value: 7342, goal: 10000 },
  calories: 420,
  water_litres: 1.8,
  today_sessions: [
    { time: "07:00", name: "Morning run", next: true },
    { time: "18:00", name: "Upper body", tag: "45m", next: false },
  ],
};

function isoWeeksAgo(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  return d.toISOString();
}

const DEMO_PROGRESS: ProgressEntry[] = [
  { progress_id: "p1", user_id: DEMO_USER.user_id, weight: 72.0, recorded_at: isoWeeksAgo(5) },
  { progress_id: "p2", user_id: DEMO_USER.user_id, weight: 71.0, recorded_at: isoWeeksAgo(4) },
  { progress_id: "p3", user_id: DEMO_USER.user_id, weight: 70.5, recorded_at: isoWeeksAgo(3) },
  { progress_id: "p4", user_id: DEMO_USER.user_id, weight: 69.5, recorded_at: isoWeeksAgo(2) },
  { progress_id: "p5", user_id: DEMO_USER.user_id, weight: 69.0, recorded_at: isoWeeksAgo(1) },
  { progress_id: "p6", user_id: DEMO_USER.user_id, weight: 68.0, recorded_at: isoWeeksAgo(0) },
];

const DEMO_MILESTONES: Milestone[] = [
  {
    milestone_id: "m1",
    user_id: DEMO_USER.user_id,
    type: "streak",
    badge: "🔥 7-day streak",
    achieved_at: isoWeeksAgo(0),
  },
  {
    milestone_id: "m2",
    user_id: DEMO_USER.user_id,
    type: "weight",
    badge: "🏅 −5 kg",
    achieved_at: isoWeeksAgo(2),
  },
  {
    milestone_id: "m3",
    user_id: DEMO_USER.user_id,
    type: "pr",
    badge: "💪 First PR",
    achieved_at: isoWeeksAgo(4),
  },
];

function daysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DEMO_SESSIONS: WorkoutSession[] = [
  {
    session_id: "s1",
    plan_id: "plan-1",
    scheduled_date: daysFromToday(1),
    scheduled_time: "07:00",
    reminder_set: true,
    status: "scheduled",
  },
  {
    session_id: "s2",
    plan_id: "plan-1",
    scheduled_date: daysFromToday(3),
    scheduled_time: "18:00",
    reminder_set: true,
    status: "scheduled",
  },
  {
    session_id: "s3",
    plan_id: "plan-1",
    scheduled_date: daysFromToday(5),
    scheduled_time: "06:30",
    reminder_set: true,
    status: "scheduled",
  },
];

function authResponse(): AuthResponse {
  return { access_token: "demo-jwt-token", token_type: "bearer", user: demoUser() };
}

function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getDemoResponse<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  await delay(); // simulate network so loading states have time to render

  // AI stubs — always 501 so the UI shows "coming soon"
  if (path.startsWith("/ai/")) {
    const err: ApiError = { status: 501, detail: "Not implemented yet" };
    throw err;
  }

  // Auth
  if (path === "/auth/login" || path === "/auth/register") {
    return authResponse() as unknown as T;
  }
  if (path === "/auth/me") return demoUser() as unknown as T;

  // Gym User
  if (path === "/gym-user/profile") {
    if (method === "PUT") return { ...DEMO_PROFILE, ...(body as object) } as T;
    return DEMO_PROFILE as unknown as T;
  }
  if (path === "/gym-user/dashboard") return DEMO_DASHBOARD as unknown as T;
  if (path === "/gym-user/plans") {
    if (method === "POST")
      return {
        plan_id: "demo-plan",
        user_id: DEMO_USER.user_id,
        status: "active",
        created_at: new Date().toISOString(),
        ...(body as object),
      } as T;
    return [] as unknown as T;
  }
  if (path === "/gym-user/activity")
    return { log_id: "demo-activity", user_id: DEMO_USER.user_id, ...(body as object) } as T;
  if (path === "/gym-user/diet")
    return { log_id: "demo-diet", user_id: DEMO_USER.user_id, ...(body as object) } as T;
  if (path === "/gym-user/progress") {
    if (method === "POST")
      return {
        progress_id: "demo-progress",
        user_id: DEMO_USER.user_id,
        ...(body as object),
      } as T;
    return DEMO_PROGRESS as unknown as T;
  }
  if (path === "/gym-user/milestones") return DEMO_MILESTONES as unknown as T;
  if (path === "/gym-user/sessions") {
    if (method === "POST")
      return { session_id: "demo-session", status: "scheduled", ...(body as object) } as T;
    return DEMO_SESSIONS as unknown as T;
  }

  // Notifications
  if (path === "/notifications/") return [] as unknown as T;
  if (path.startsWith("/notifications/")) return undefined as unknown as T;

  // Fallback for anything we forgot
  const err: ApiError = { status: 404, detail: `Demo: no mock for ${method} ${path}` };
  throw err;
}
