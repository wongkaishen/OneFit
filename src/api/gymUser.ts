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
