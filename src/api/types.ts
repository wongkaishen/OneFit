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
