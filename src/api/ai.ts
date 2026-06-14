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
