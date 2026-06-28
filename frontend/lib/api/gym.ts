import { request, upload } from "./client";
import type {
  AIExercise,
  FitnessProfile, FitnessProfileIn,
  GymActivityIn, GymActivityLog,
  GymDashboard,
  GymDietIn, GymDietLog,
  GymFeedback,
  GymMilestone,
  GymProgressEntry, GymProgressIn,
  MealPlanOut,
  WorkoutPlan,
  WorkoutSession, WorkoutSessionIn,
} from "./types";

// Profile
export const getProfile = () => request<FitnessProfile>("/gym/profile");
export const updateProfile = (body: FitnessProfileIn) =>
  request<FitnessProfile>("/gym/profile", { method: "PUT", body: JSON.stringify(body) });

// Workout plans
export const listPlans = () => request<WorkoutPlan[]>("/gym/plans");
export const createPlan = (goal: string) =>
  request<WorkoutPlan>("/gym/plans", { method: "POST", body: JSON.stringify({ goal }) });
export const updatePlan = (id: string, body: { goal?: string; status?: string }) =>
  request<WorkoutPlan>(`/gym/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const discardPlan = (id: string) =>
  request<void>(`/gym/plans/${id}`, { method: "DELETE" });

// Activity logging
export const logActivity = (body: GymActivityIn) =>
  request<GymActivityLog>("/gym/activity", { method: "POST", body: JSON.stringify(body) });

// Diet logging
export const logDiet = (body: GymDietIn) =>
  request<GymDietLog>("/gym/diet", { method: "POST", body: JSON.stringify(body) });

// Dashboard — today's calorie balance
export const getDashboard = (day?: string) =>
  request<GymDashboard>(`/gym/dashboard${day ? `?day=${day}` : ""}`);

// Progress + milestones
export const listProgress = () => request<GymProgressEntry[]>("/gym/progress");
export const addProgress = (body: GymProgressIn) =>
  request<GymProgressEntry>("/gym/progress", { method: "POST", body: JSON.stringify(body) });
export const listMilestones = () => request<GymMilestone[]>("/gym/milestones");

// Meal plans published to me by a wellness specialist
export const listMealPlans = () => request<MealPlanOut[]>("/gym/meal-plans");

// Feedback addressed to me by a wellness specialist
export const listFeedback = () => request<GymFeedback[]>("/gym/feedback");

// Scheduled sessions
export const listSessions = () => request<WorkoutSession[]>("/gym/sessions");
export const scheduleSession = (body: WorkoutSessionIn) =>
  request<WorkoutSession>("/gym/sessions", { method: "POST", body: JSON.stringify(body) });

// Progress photo upload
export const uploadProgressPhoto = (file: File) =>
  upload<{ photo_url: string }>("/gym/progress/photo", file);

// Accept AI-generated workout plan (A5)
export const acceptAiPlan = (goal: string, exercises: AIExercise[]) =>
  request<WorkoutPlan>("/gym/plans/ai-accept", { method: "POST", body: JSON.stringify({ goal, exercises }) });
