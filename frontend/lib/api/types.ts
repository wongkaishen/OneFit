export interface NotificationOut {
  notification_id: string;
  recipient_id: string;
  type: string;
  message: string;
  /** Structured content (nullable for legacy rows; fall back to `message`). */
  title: string | null;
  body: string | null;
  ref_type: string | null;
  ref_id: string | null;
  status: string;
  sent_at: string | null;
}

export type Role = "gym_user" | "wellness_specialist" | "admin";
export type RegisterRole = "gym_user" | "wellness_specialist";

export interface CurrentUser {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  role: Role;
  status: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

export interface RegisterIn {
  name: string;
  email: string;
  password: string;
  role: RegisterRole;
}

// Gym User
export interface FitnessProfile {
  user_id: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  body_fat_percent: number | null;
  fitness_goal: string | null;
}

export interface FitnessProfileIn {
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  body_fat_percent?: number | null;
  fitness_goal?: string | null;
}

export interface WorkoutPlan {
  plan_id: string;
  user_id: string;
  goal: string;
  generated_by: string;
  status: string;
  created_at: string;
}

export interface GymActivityLog {
  log_id: string;
  user_id: string;
  workout_type: string | null;
  duration: number | null;
  steps: number | null;
  heart_rate: number | null;
  calories_burned: number | null;
  source: string;
  status: string;
  log_date: string;
}

export interface GymActivityIn {
  workout_type?: string | null;
  duration?: number | null;
  steps?: number | null;
  heart_rate?: number | null;
  calories_burned?: number | null;
  log_date: string;
}

export interface GymDietLog {
  log_id: string;
  user_id: string;
  meal_time: string | null;
  food_item: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  entry_mode: string;
  log_date: string;
}

export interface GymDietIn {
  meal_time?: string | null;
  food_item?: string | null;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  log_date: string;
}

export interface GymProgressEntry {
  progress_id: string;
  user_id: string;
  weight: number | null;
  body_fat_percent: number | null;
  height: number | null;
  photo_url: string | null;
  recorded_at: string;
}

export interface GymProgressIn {
  weight?: number | null;
  body_fat_percent?: number | null;
  height?: number | null;
  photo_url?: string | null;
}

export interface GymMilestone {
  milestone_id: string;
  user_id: string;
  type: string;
  badge: string | null;
  achieved_at: string;
}

export interface GymFeedback {
  feedback_id: string;
  specialist_id: string;
  specialist_name: string | null;
  notes: string;
  plan_updated: boolean;
  submitted_at: string;
}

export interface GymDashboard {
  date: string;
  calories_consumed: number;
  calories_burned: number;
  diet_entries: number;
  activity_entries: number;
}

export interface WorkoutSession {
  session_id: string;
  plan_id: string;
  scheduled_date: string;
  scheduled_time: string;
  reminder_set: boolean;
  status: string;
}

export interface WorkoutSessionIn {
  plan_id: string;
  scheduled_date: string;
  scheduled_time: string;
  reminder_set?: boolean;
}

export interface ClientSummary {
  user_id: string;
  name: string | null;
  email: string;
  goal: string | null;
  weight: number | null;
  body_fat_percent: number | null;
  last_active_at: string | null;
}

// Specialist views of a client's logs. These mirror the backend ORM exactly
// (see GymActivityLog / GymDietLog / GymProgressEntry, which are the same shapes).
export interface ActivityLog {
  log_id: string;
  user_id: string;
  workout_type: string | null;
  duration: number | null;
  steps: number | null;
  heart_rate: number | null;
  calories_burned: number | null;
  source: string;
  status: string;
  log_date: string;
}

export interface DietaryLog {
  log_id: string;
  user_id: string;
  meal_time: string | null;
  food_item: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  entry_mode: string;
  log_date: string;
}

export interface ProgressEntry {
  progress_id: string;
  user_id: string;
  weight: number | null;
  body_fat_percent: number | null;
  height: number | null;
  photo_url: string | null;
  recorded_at: string;
}

/** Shape the specialist's meal-plan builder writes into `payload`. */
export interface MealPlanItem {
  name: string;
  kcal: number;
}
export interface MealPlanMeal {
  meal: string;
  items: MealPlanItem[];
}
export interface MealPlanDay {
  day: string;
  meals: MealPlanMeal[];
}

export type MealPlanStatus = "draft" | "published";

export interface MealPlanOut {
  plan_id: string;
  specialist_id: string;
  client_id: string | null;
  name: string;
  goal: string;
  days_per_week: number;
  payload: MealPlanDay[] | unknown;
  status: MealPlanStatus;
  created_at: string;
}

export interface MealPlanIn {
  name: string;
  goal?: string;
  days_per_week?: number;
  payload?: unknown;
  client_id?: string | null;
  status?: MealPlanStatus;
}

export interface MealPlanUpdate {
  name?: string;
  goal?: string;
  days_per_week?: number;
  payload?: unknown;
  client_id?: string | null;
  status?: MealPlanStatus;
}

export interface ContentOut {
  content_id: string;
  specialist_id: string;
  title: string;
  body: string;
  category: string;
  media_url: string | null;
  status: string;
  visibility: boolean;
  created_at: string;
}

export interface ContentIn {
  title: string;
  body: string;
  category: string;
  media_url?: string | null;
  permission_confirmed?: boolean;
}

export interface FeedbackIn {
  user_id: string;
  notes: string;
  plan_updated?: boolean;
}

export interface UserOut {
  user_id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

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

export interface AnnouncementOut {
  announcement_id: string;
  admin_id: string;
  title: string;
  body: string;
  target_audience: string;
  status: string;
  sent_at: string | null;
}

export interface AnnouncementIn {
  title: string;
  body: string;
  target_audience: string;
}
