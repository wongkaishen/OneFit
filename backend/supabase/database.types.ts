// Generated from the OneFit Supabase schema (project cnsbxqinucvgiqknqwex).
// Regenerate after schema changes via the Supabase MCP/CLI:
//   supabase gen types typescript --project-id cnsbxqinucvgiqknqwex
// Intended for the upcoming Next.js frontend (supabase-js typing).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          calories_burned: number | null
          duration: number | null
          heart_rate: number | null
          log_date: string
          log_id: string
          source: Database["public"]["Enums"]["activity_source"]
          status: Database["public"]["Enums"]["activity_status"]
          steps: number | null
          user_id: string
          workout_type: string | null
        }
        Insert: {
          calories_burned?: number | null
          duration?: number | null
          heart_rate?: number | null
          log_date: string
          log_id?: string
          source?: Database["public"]["Enums"]["activity_source"]
          status?: Database["public"]["Enums"]["activity_status"]
          steps?: number | null
          user_id: string
          workout_type?: string | null
        }
        Update: {
          calories_burned?: number | null
          duration?: number | null
          heart_rate?: number | null
          log_date?: string
          log_id?: string
          source?: Database["public"]["Enums"]["activity_source"]
          status?: Database["public"]["Enums"]["activity_status"]
          steps?: number | null
          user_id?: string
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gym_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admins: {
        Row: {
          permissions: string | null
          user_id: string
        }
        Insert: {
          permissions?: string | null
          user_id: string
        }
        Update: {
          permissions?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          admin_id: string
          announcement_id: string
          body: string
          sent_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          target_audience: Database["public"]["Enums"]["announcement_audience"]
          title: string
        }
        Insert: {
          admin_id: string
          announcement_id?: string
          body: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_audience?: Database["public"]["Enums"]["announcement_audience"]
          title: string
        }
        Update: {
          admin_id?: string
          announcement_id?: string
          body?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_audience?: Database["public"]["Enums"]["announcement_audience"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: string | null
          log_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          log_id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_groups: {
        Row: {
          description: string | null
          group_id: string
          name: string
          specialist_id: string
        }
        Insert: {
          description?: string | null
          group_id?: string
          name: string
          specialist_id: string
        }
        Update: {
          description?: string | null
          group_id?: string
          name?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_groups_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "wellness_specialists"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          group_id: string
          post_id: string
          severity: Database["public"]["Enums"]["post_severity"] | null
          status: Database["public"]["Enums"]["post_status"]
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          group_id: string
          post_id?: string
          severity?: Database["public"]["Enums"]["post_severity"] | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          group_id?: string
          post_id?: string
          severity?: Database["public"]["Enums"]["post_severity"] | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["group_id"]
          },
        ]
      }
      dietary_logs: {
        Row: {
          calories: number
          carbs: number | null
          entry_mode: Database["public"]["Enums"]["entry_mode"]
          fat: number | null
          food_item: string | null
          log_date: string
          log_id: string
          meal_time: Database["public"]["Enums"]["meal_time"] | null
          protein: number | null
          user_id: string
        }
        Insert: {
          calories: number
          carbs?: number | null
          entry_mode?: Database["public"]["Enums"]["entry_mode"]
          fat?: number | null
          food_item?: string | null
          log_date: string
          log_id?: string
          meal_time?: Database["public"]["Enums"]["meal_time"] | null
          protein?: number | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number | null
          entry_mode?: Database["public"]["Enums"]["entry_mode"]
          fat?: number | null
          food_item?: string | null
          log_date?: string
          log_id?: string
          meal_time?: Database["public"]["Enums"]["meal_time"] | null
          protein?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dietary_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gym_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      educational_content: {
        Row: {
          body: string
          category: string
          content_id: string
          created_at: string
          media_url: string | null
          permission_confirmed: boolean
          specialist_id: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          visibility: boolean
        }
        Insert: {
          body: string
          category: string
          content_id?: string
          created_at?: string
          media_url?: string | null
          permission_confirmed?: boolean
          specialist_id: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          visibility?: boolean
        }
        Update: {
          body?: string
          category?: string
          content_id?: string
          created_at?: string
          media_url?: string | null
          permission_confirmed?: boolean
          specialist_id?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          visibility?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "educational_content_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "wellness_specialists"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feedback: {
        Row: {
          feedback_id: string
          notes: string
          plan_updated: boolean
          specialist_id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          feedback_id?: string
          notes: string
          plan_updated?: boolean
          specialist_id: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          feedback_id?: string
          notes?: string
          plan_updated?: boolean
          specialist_id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "wellness_specialists"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gym_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_profiles: {
        Row: {
          age: number | null
          body_fat_percent: number | null
          fitness_goal: string | null
          height: number | null
          user_id: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          body_fat_percent?: number | null
          fitness_goal?: string | null
          height?: number | null
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          body_fat_percent?: number | null
          fitness_goal?: string | null
          height?: number | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "gym_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gym_users: {
        Row: {
          membership_status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Insert: {
          membership_status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Update: {
          membership_status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_trend_reports: {
        Row: {
          activity_consistency: number | null
          adherence: number | null
          avg_calories: number | null
          cohort: string
          created_at: string
          milestone_rate: number | null
          period: string
          report_id: string
          specialist_id: string
        }
        Insert: {
          activity_consistency?: number | null
          adherence?: number | null
          avg_calories?: number | null
          cohort: string
          created_at?: string
          milestone_rate?: number | null
          period: string
          report_id?: string
          specialist_id: string
        }
        Update: {
          activity_consistency?: number | null
          adherence?: number | null
          avg_calories?: number | null
          cohort?: string
          created_at?: string
          milestone_rate?: number | null
          period?: string
          report_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_trend_reports_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "wellness_specialists"
            referencedColumns: ["user_id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved_at: string
          badge: string | null
          milestone_id: string
          type: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          badge?: string | null
          milestone_id?: string
          type: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          badge?: string | null
          milestone_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gym_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          message: string
          notification_id: string
          recipient_id: string
          sent_at: string
          status: Database["public"]["Enums"]["notification_status"]
          type: string
        }
        Insert: {
          message: string
          notification_id?: string
          recipient_id: string
          sent_at?: string
          status?: Database["public"]["Enums"]["notification_status"]
          type: string
        }
        Update: {
          message?: string
          notification_id?: string
          recipient_id?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["notification_status"]
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["account_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          body_fat_percent: number | null
          height: number | null
          photo_url: string | null
          progress_id: string
          recorded_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          body_fat_percent?: number | null
          height?: number | null
          photo_url?: string | null
          progress_id?: string
          recorded_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          body_fat_percent?: number | null
          height?: number | null
          photo_url?: string | null
          progress_id?: string
          recorded_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gym_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wellness_specialists: {
        Row: {
          certification_doc: string | null
          specialization: string
          user_id: string
        }
        Insert: {
          certification_doc?: string | null
          specialization: string
          user_id: string
        }
        Update: {
          certification_doc?: string | null
          specialization?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_specialists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_tasks: {
        Row: {
          description: string
          due_date: string
          specialist_id: string
          status: Database["public"]["Enums"]["task_status"]
          target_id: string
          target_metric: string | null
          task_id: string
          type: string
        }
        Insert: {
          description: string
          due_date: string
          specialist_id: string
          status?: Database["public"]["Enums"]["task_status"]
          target_id: string
          target_metric?: string | null
          task_id?: string
          type: string
        }
        Update: {
          description?: string
          due_date?: string
          specialist_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          target_id?: string
          target_metric?: string | null
          task_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_tasks_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "wellness_specialists"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          generated_by: string
          goal: string
          plan_id: string
          status: Database["public"]["Enums"]["plan_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_by?: string
          goal: string
          plan_id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          generated_by?: string
          goal?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gym_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          plan_id: string
          reminder_set: boolean
          scheduled_date: string
          scheduled_time: string
          session_id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          plan_id: string
          reminder_set?: boolean
          scheduled_date: string
          scheduled_time: string
          session_id?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          plan_id?: string
          reminder_set?: boolean
          scheduled_date?: string
          scheduled_time?: string
          session_id?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_status: "pending" | "active" | "suspended"
      activity_source: "manual" | "wearable"
      activity_status: "pending" | "completed"
      announcement_audience: "all" | "gym_users" | "specialists"
      announcement_status: "draft" | "published"
      content_status: "Draft" | "Published" | "Archived" | "Rejected"
      entry_mode: "quick" | "detailed"
      meal_time: "breakfast" | "lunch" | "dinner" | "snack"
      membership_status: "active" | "suspended"
      notification_status: "read" | "unread"
      plan_status: "active" | "superseded"
      post_severity: "low" | "medium" | "high"
      post_status:
        | "Posted"
        | "Flagged"
        | "UnderReview"
        | "Approved"
        | "Removed"
        | "Escalated"
      session_status: "scheduled" | "completed" | "missed"
      task_status:
        | "Assigned"
        | "InProgress"
        | "Submitted"
        | "UnderReview"
        | "Completed"
        | "Overdue"
        | "Cancelled"
      user_role: "gym_user" | "wellness_specialist" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "active", "suspended"],
      activity_source: ["manual", "wearable"],
      activity_status: ["pending", "completed"],
      announcement_audience: ["all", "gym_users", "specialists"],
      announcement_status: ["draft", "published"],
      content_status: ["Draft", "Published", "Archived", "Rejected"],
      entry_mode: ["quick", "detailed"],
      meal_time: ["breakfast", "lunch", "dinner", "snack"],
      membership_status: ["active", "suspended"],
      notification_status: ["read", "unread"],
      plan_status: ["active", "superseded"],
      post_severity: ["low", "medium", "high"],
      post_status: [
        "Posted",
        "Flagged",
        "UnderReview",
        "Approved",
        "Removed",
        "Escalated",
      ],
      session_status: ["scheduled", "completed", "missed"],
      task_status: [
        "Assigned",
        "InProgress",
        "Submitted",
        "UnderReview",
        "Completed",
        "Overdue",
        "Cancelled",
      ],
      user_role: ["gym_user", "wellness_specialist", "admin"],
    },
  },
} as const
