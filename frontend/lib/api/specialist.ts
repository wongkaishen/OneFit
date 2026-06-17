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

export const sendSpecialistAnnouncement = (body: {
  title: string;
  body: string;
  audience?: "gym_users" | "all";
}) =>
  request<{ sent: number; audience: string }>("/specialist/announcements", {
    method: "POST",
    body: JSON.stringify(body),
  });
