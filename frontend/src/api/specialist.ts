import { request } from "./client";
import type {
  ActivityLog,
  ClientSummary,
  DietaryLog,
  EducationalContent,
  Feedback,
  MealPlan,
  MealPlanDay,
  ProgressEntry,
} from "./types";

export const listContent = () =>
  request<EducationalContent[]>("/specialist/content");

export const createContent = (c: {
  title: string;
  body: string;
  category: string;
  media_url?: string;
  permission_confirmed?: boolean;
}) => request<EducationalContent>("/specialist/content", { method: "POST", body: c });

export const submitFeedback = (f: {
  user_id: string;
  notes: string;
  plan_updated?: boolean;
}) => request<Feedback>("/specialist/feedback", { method: "POST", body: f });

// --- Client roster + detail -----------------------------------------------
export const listClients = () => request<ClientSummary[]>("/specialist/clients");

export const getClient = (userId: string) =>
  request<ClientSummary>(`/specialist/clients/${userId}`);

export const getClientActivity = (userId: string, limit = 20) =>
  request<ActivityLog[]>(`/specialist/clients/${userId}/activity?limit=${limit}`);

export const getClientDiet = (userId: string, limit = 20) =>
  request<DietaryLog[]>(`/specialist/clients/${userId}/diet?limit=${limit}`);

export const getClientProgress = (userId: string, limit = 20) =>
  request<ProgressEntry[]>(`/specialist/clients/${userId}/progress?limit=${limit}`);

// --- Meal plans -----------------------------------------------------------
export const listMealPlans = () => request<MealPlan[]>("/specialist/meal-plans");

export const createMealPlan = (body: {
  name: string;
  goal?: string;
  days_per_week?: number;
  payload: MealPlanDay[];
  client_id?: string | null;
}) => request<MealPlan>("/specialist/meal-plans", { method: "POST", body });
