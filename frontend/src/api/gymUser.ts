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

export const getProfile = () => request<FitnessProfile>("/gym/profile");
export const updateProfile = (p: Partial<FitnessProfile>) =>
  request<FitnessProfile>("/gym/profile", { method: "PUT", body: p });

export const getPlans = () => request<WorkoutPlan[]>("/gym/plans");
export const createPlan = (p: { goal: string; generated_by?: string }) =>
  request<WorkoutPlan>("/gym/plans", { method: "POST", body: p });

export const logActivity = (a: ActivityLog) =>
  request<ActivityLog>("/gym/activity", { method: "POST", body: a });

export const logDiet = (d: DietaryLog) =>
  request<DietaryLog>("/gym/diet", { method: "POST", body: d });

export const getDashboard = () => request<DashboardSummary>("/gym/dashboard");

export const getProgress = () => request<ProgressEntry[]>("/gym/progress");
export const logProgress = (e: ProgressEntry) =>
  request<ProgressEntry>("/gym/progress", { method: "POST", body: e });

export const getMilestones = () => request<Milestone[]>("/gym/milestones");

export const getSessions = () => request<WorkoutSession[]>("/gym/sessions");
export const createSession = (s: Omit<WorkoutSession, "session_id" | "status">) =>
  request<WorkoutSession>("/gym/sessions", { method: "POST", body: s });
