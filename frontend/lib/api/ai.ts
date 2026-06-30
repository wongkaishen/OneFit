import { request } from "./client";
import type { AIPlan, AITargets, NutritionInfo } from "./types";

export const generateWorkoutPlan = (goal: string) =>
  request<AIPlan>("/ai/workout-plan", { method: "POST", body: JSON.stringify({ goal }) });
export const searchNutrition = (q: string) =>
  request<NutritionInfo>(`/ai/nutrition/search?q=${encodeURIComponent(q)}`);
export const feedbackSummary = (notes: string, context = "") =>
  request<{ summary: string }>("/ai/feedback-summary", { method: "POST", body: JSON.stringify({ notes, context }) });
export const recalcTargets = (profile: Record<string, unknown> = {}, recent: Record<string, unknown> = {}) =>
  request<AITargets>("/ai/recalculate-targets", { method: "POST", body: JSON.stringify({ profile, recent }) });
