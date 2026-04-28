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
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          org_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          org_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          org_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["announcement_category"]
          content: string | null
          created_at: string
          id: string
          org_id: string
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: Database["public"]["Enums"]["announcement_category"]
          content?: string | null
          created_at?: string
          id?: string
          org_id: string
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["announcement_category"]
          content?: string | null
          created_at?: string
          id?: string
          org_id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          error_message: string | null
          id: string
          org_id: string
          response: Json | null
          sent_at: string
          status: Database["public"]["Enums"]["automation_log_status"]
          task_count: number | null
          triggered_by: string | null
          type: Database["public"]["Enums"]["automation_log_type"]
          user_id: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          org_id: string
          response?: Json | null
          sent_at?: string
          status: Database["public"]["Enums"]["automation_log_status"]
          task_count?: number | null
          triggered_by?: string | null
          type: Database["public"]["Enums"]["automation_log_type"]
          user_id?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          org_id?: string
          response?: Json | null
          sent_at?: string
          status?: Database["public"]["Enums"]["automation_log_status"]
          task_count?: number | null
          triggered_by?: string | null
          type?: Database["public"]["Enums"]["automation_log_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_logs: {
        Row: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at: string
          id: string
          ip: string | null
          reason: string | null
          target_org_id: string
          target_org_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip?: string | null
          reason?: string | null
          target_org_id: string
          target_org_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          reason?: string | null
          target_org_id?: string
          target_org_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_schedules: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          last_email_error: string | null
          last_email_sent_at: string | null
          last_email_sent_date: string | null
          last_email_status: string | null
          last_webhook_error: string | null
          last_webhook_sent_at: string | null
          last_webhook_sent_date: string | null
          last_webhook_status: string | null
          org_id: string
          recipient_email: string | null
          selected_days: number[]
          send_time: string
          timezone: string
          updated_at: string
          user_id: string
          webhook_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          last_email_error?: string | null
          last_email_sent_at?: string | null
          last_email_sent_date?: string | null
          last_email_status?: string | null
          last_webhook_error?: string | null
          last_webhook_sent_at?: string | null
          last_webhook_sent_date?: string | null
          last_webhook_status?: string | null
          org_id: string
          recipient_email?: string | null
          selected_days?: number[]
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
          webhook_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          last_email_error?: string | null
          last_email_sent_at?: string | null
          last_email_sent_date?: string | null
          last_email_status?: string | null
          last_webhook_error?: string | null
          last_webhook_sent_at?: string | null
          last_webhook_sent_date?: string | null
          last_webhook_status?: string | null
          org_id?: string
          recipient_email?: string | null
          selected_days?: number[]
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          webhook_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "member_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_email_automation: {
        Row: {
          created_at: string
          default_recipient: string | null
          email_subject: string
          enabled: boolean
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_recipient?: string | null
          email_subject?: string
          enabled?: boolean
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_recipient?: string | null
          email_subject?: string
          enabled?: boolean
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_email_automation_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_webhook_automation: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          org_id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          org_id: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          org_id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_webhook_automation_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          slug: string
          suspended: boolean
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          slug: string
          suspended?: boolean
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          slug?: string
          suspended?: boolean
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_admin_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          session_token: string
          user_id: string
          view_as_org_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          session_token: string
          user_id: string
          view_as_org_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string
          view_as_org_id?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          totp_enrolled_at: string | null
          totp_secret_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          totp_enrolled_at?: string | null
          totp_secret_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          totp_enrolled_at?: string | null
          totp_secret_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          assigned_by: string
          assignee_id: string
          created_at: string
          id: string
          org_id: string
          task_id: string
        }
        Insert: {
          assigned_by: string
          assignee_id: string
          created_at?: string
          id?: string
          org_id: string
          task_id: string
        }
        Update: {
          assigned_by?: string
          assignee_id?: string
          created_at?: string
          id?: string
          org_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean
          notes: string | null
          org_id: string
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          org_id: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          org_id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_pattern?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _token: string }; Returns: string }
      bootstrap_first_platform_admin: {
        Args: { _email: string }
        Returns: string
      }
      create_organization: {
        Args: { _name: string; _slug: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          slug: string
          suspended: boolean
          suspended_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_view_as_org: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_task_assignee: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      join_org_by_code: { Args: { _code: string }; Returns: string }
      lookup_invite: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          invite_id: string
          org_id: string
          org_name: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
        }[]
      }
      super_admin_create_organization: {
        Args: { _name: string; _owner_email: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          slug: string
          suspended: boolean
          suspended_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      super_admin_delete_organization: {
        Args: { _org_id: string }
        Returns: boolean
      }
      super_admin_list_organizations: {
        Args: never
        Returns: {
          created_at: string
          id: string
          member_count: number
          name: string
          owner_email: string
          owner_id: string
          slug: string
          suspended: boolean
          task_count: number
        }[]
      }
      super_admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          is_platform_admin: boolean
          org_count: number
          user_id: string
        }[]
      }
      super_admin_metrics: { Args: never; Returns: Json }
      super_admin_set_org_suspended: {
        Args: { _org_id: string; _suspended: boolean }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          slug: string
          suspended: boolean
          suspended_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      super_admin_update_organization: {
        Args: { _name: string; _org_id: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          slug: string
          suspended: boolean
          suspended_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      announcement_category:
        | "very_important"
        | "important"
        | "less_important"
        | "new_features"
      app_role: "owner" | "admin" | "team_manager" | "member"
      automation_log_status: "success" | "error"
      automation_log_type: "email" | "webhook"
      automation_status: "success" | "error" | "skipped"
      automation_type: "email" | "webhook"
      invite_status: "pending" | "accepted" | "revoked" | "expired"
      task_priority: "urgent" | "high" | "medium" | "low"
      task_status: "pending" | "completed" | "archived"
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
      announcement_category: [
        "very_important",
        "important",
        "less_important",
        "new_features",
      ],
      app_role: ["owner", "admin", "team_manager", "member"],
      automation_log_status: ["success", "error"],
      automation_log_type: ["email", "webhook"],
      automation_status: ["success", "error", "skipped"],
      automation_type: ["email", "webhook"],
      invite_status: ["pending", "accepted", "revoked", "expired"],
      task_priority: ["urgent", "high", "medium", "low"],
      task_status: ["pending", "completed", "archived"],
    },
  },
} as const
