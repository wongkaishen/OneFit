export interface ClientSummary {
  user_id: string;
  name: string | null;
  email: string;
  goal: string | null;
  weight: number | null;
  body_fat_percent: number | null;
  last_active_at: string | null;
}

export interface ActivityLog {
  log_id: string;
  user_id: string;
  activity_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  intensity: string | null;
  log_date: string;
}

export interface DietaryLog {
  log_id: string;
  user_id: string;
  meal_type: string | null;
  food_item: string | null;
  calories: number | null;
  log_date: string;
}

export interface ProgressEntry {
  entry_id: string;
  user_id: string;
  weight: number | null;
  body_fat_percent: number | null;
  recorded_at: string;
}

export interface MealPlanOut {
  plan_id: string;
  specialist_id: string;
  client_id: string | null;
  name: string;
  goal: string;
  days_per_week: number;
  payload: unknown;
  created_at: string;
}

export interface MealPlanIn {
  name: string;
  goal?: string;
  days_per_week?: number;
  payload?: unknown;
  client_id?: string | null;
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
