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

export interface EducationalContent {
  content_id: string;
  specialist_id: string;
  title: string;
  body: string;
  category: string;
  media_url?: string;
  permission_confirmed: boolean;
  status: "Draft" | "Published" | "Archived";
  visibility: boolean;
  created_at: string;
}

export interface Feedback {
  feedback_id: string;
  specialist_id: string;
  user_id: string;
  notes: string;
  plan_updated: boolean;
  submitted_at: string;
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

// --- Specialist client roster ---------------------------------------------
export interface ClientSummary {
  user_id: string;
  name: string | null;
  email: string;
  goal: string | null;
  weight: number | null;
  body_fat_percent: number | null;
  last_active_at: string | null;
}

// --- Specialist-authored meal plan ---------------------------------------
export interface MealPlanMealItem {
  slot?: string;
  food_item: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}
export interface MealPlanDay {
  day: string;
  meals: MealPlanMealItem[];
}
export interface MealPlan {
  plan_id: string;
  specialist_id: string;
  client_id: string | null;
  name: string;
  goal: string;
  days_per_week: number;
  payload: MealPlanDay[];
  created_at: string;
}

// --- Admin dashboard -----------------------------------------------------
export interface AdminStats {
  total_users: number;
  total_gym_users: number;
  total_specialists: number;
  total_admins: number;
  pending_approvals: number;
  active_today: number;
}

export interface AuditEntry {
  log_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export type AnnouncementAudience = "all" | "gym_users" | "specialists";

export interface Announcement {
  announcement_id: string;
  admin_id: string;
  title: string;
  body: string;
  target_audience: AnnouncementAudience;
  status: "draft" | "published";
  sent_at: string | null;
}
