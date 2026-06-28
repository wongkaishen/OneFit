import { request, upload } from "./client";
import type {
  ActivityLog, ClientSummary, ContentIn, ContentOut, DietaryLog,
  FeedbackIn, MealPlanIn, MealPlanOut, MealPlanUpdate, ProgressEntry,
  WellnessTaskOut, WellnessTaskIn,
} from "./types";

export const listClients = () => request<ClientSummary[]>("/specialist/clients");
export const getClient = (id: string) => request<ClientSummary>(`/specialist/clients/${id}`);
export const addClient = (email: string) =>
  request<ClientSummary>("/specialist/clients", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
export const removeClient = (id: string) =>
  request<void>(`/specialist/clients/${id}`, { method: "DELETE" });
export const clientActivity = (id: string) =>
  request<ActivityLog[]>(`/specialist/clients/${id}/activity`);
export const clientDiet = (id: string) =>
  request<DietaryLog[]>(`/specialist/clients/${id}/diet`);
export const clientProgress = (id: string) =>
  request<ProgressEntry[]>(`/specialist/clients/${id}/progress`);

export const listMealPlans = () => request<MealPlanOut[]>("/specialist/meal-plans");
export const createMealPlan = (body: MealPlanIn) =>
  request<MealPlanOut>("/specialist/meal-plans", { method: "POST", body: JSON.stringify(body) });
export const updateMealPlan = (id: string, body: MealPlanUpdate) =>
  request<MealPlanOut>(`/specialist/meal-plans/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteMealPlan = (id: string) =>
  request<void>(`/specialist/meal-plans/${id}`, { method: "DELETE" });

export const listContent = () => request<ContentOut[]>("/specialist/content");
export const createContent = (body: ContentIn) =>
  request<ContentOut>("/specialist/content", { method: "POST", body: JSON.stringify(body) });

export interface ContentUpdate {
  title?: string;
  body?: string;
  category?: string;
  media_url?: string | null;
  status?: "Draft" | "Published" | "Archived";
}
export const updateContent = (id: string, body: ContentUpdate) =>
  request<ContentOut>(`/specialist/content/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const submitFeedback = (body: FeedbackIn) =>
  request<unknown>("/specialist/feedback", { method: "POST", body: JSON.stringify(body) });

export const listTasks = () => request<WellnessTaskOut[]>("/specialist/tasks");
export const assignTask = (body: WellnessTaskIn) =>
  request<WellnessTaskOut>("/specialist/tasks", { method: "POST", body: JSON.stringify(body) });
export const deleteContent = (id: string) =>
  request<void>(`/specialist/content/${id}`, { method: "DELETE" });

export interface HealthTrendIn {
  cohort?: string;
  period?: string;
}

export interface HealthTrendOut {
  report_id: string;
  specialist_id: string;
  cohort: string;
  period: string;
  adherence: number | null;
  avg_calories: number | null;
  activity_consistency: number | null;
  milestone_rate: number | null;
  created_at: string;
  recommendation?: string;
}

export const listHealthTrends = () => request<HealthTrendOut[]>("/specialist/health-trends");
export const createHealthTrend = (body?: HealthTrendIn) =>
  request<HealthTrendOut>("/specialist/health-trends", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

export const sendSpecialistAnnouncement = (body: {
  title: string;
  body: string;
  audience?: "gym_users" | "all";
}) =>
  request<{ sent: number; audience: string }>("/specialist/announcements", {
    method: "POST",
    body: JSON.stringify(body),
  });

// File uploads
export const uploadContentMedia = (file: File) =>
  upload<{ media_url: string }>("/specialist/content/media", file);
export const uploadCredential = (file: File) =>
  upload<{ stored: boolean }>("/specialist/credentials", file);
