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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          incident_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          incident_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          incident_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      case_updates: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          officer_id: string
          status_change: string | null
          update_text: string
          visible_to_citizen: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          officer_id: string
          status_change?: string | null
          update_text: string
          visible_to_citizen?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          officer_id?: string
          status_change?: string | null
          update_text?: string
          visible_to_citizen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          additional_info: string | null
          area: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_officer_id: string | null
          category: string
          citizen_id: string
          city: string | null
          created_at: string
          deadline: string | null
          department: string | null
          description: string
          id: string
          incident_date: string | null
          incident_time: string | null
          is_emergency: boolean
          landmark: string | null
          location_description: string | null
          ml_priority_suggestion: string | null
          priority_score: number | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subcategory: string | null
          suspect_description: string | null
          updated_at: string
          urgency: string
          vehicle_info: string | null
          evidence_urls: string[] | null
          close_reason: string | null
          closed_by: string | null
          closed_at: string | null
        }
        Insert: {
          additional_info?: string | null
          area?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_officer_id?: string | null
          category: string
          citizen_id: string
          city?: string | null
          created_at?: string
          deadline?: string | null
          department?: string | null
          description: string
          id?: string
          incident_date?: string | null
          incident_time?: string | null
          is_emergency?: boolean
          landmark?: string | null
          location_description?: string | null
          ml_priority_suggestion?: string | null
          priority_score?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subcategory?: string | null
          suspect_description?: string | null
          updated_at?: string
          urgency?: string
          vehicle_info?: string | null
          evidence_urls?: string[] | null
          close_reason?: string | null
          closed_by?: string | null
          closed_at?: string | null
        }
        Update: {
          additional_info?: string | null
          area?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_officer_id?: string | null
          category?: string
          citizen_id?: string
          city?: string | null
          created_at?: string
          deadline?: string | null
          department?: string | null
          description?: string
          id?: string
          incident_date?: string | null
          incident_time?: string | null
          is_emergency?: boolean
          landmark?: string | null
          location_description?: string | null
          ml_priority_suggestion?: string | null
          priority_score?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subcategory?: string | null
          suspect_description?: string | null
          updated_at?: string
          urgency?: string
          vehicle_info?: string | null
          evidence_urls?: string[] | null
          close_reason?: string | null
          closed_by?: string | null
          closed_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          incident_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          incident_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          incident_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_items: {
        Row: {
          area: string | null
          category: string
          citizen_id: string
          city: string | null
          contact_info: string | null
          created_at: string
          date_lost: string | null
          description: string
          id: string
          image_url: string | null
          item_name: string
          last_seen_location: string | null
          officer_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          category: string
          citizen_id: string
          city?: string | null
          contact_info?: string | null
          created_at?: string
          date_lost?: string | null
          description: string
          id?: string
          image_url?: string | null
          item_name: string
          last_seen_location?: string | null
          officer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          category?: string
          citizen_id?: string
          city?: string | null
          contact_info?: string | null
          created_at?: string
          date_lost?: string | null
          description?: string
          id?: string
          image_url?: string | null
          item_name?: string
          last_seen_location?: string | null
          officer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      officer_registry: {
        Row: {
          area: string | null
          badge_id: string
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          official_email: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          area?: string | null
          badge_id: string
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          official_email: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          area?: string | null
          badge_id?: string
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          official_email?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sos_reports: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          emergency_type: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          message: string | null
          name: string | null
          phone: string
          status: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          emergency_type: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          message?: string | null
          name?: string | null
          phone: string
          status?: string
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          emergency_type?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          message?: string | null
          name?: string | null
          phone?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          is_approved: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_area: { Args: { _user_id: string }; Returns: string }
      get_user_city: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "citizen" | "field_police" | "higher_officer" | "admin"
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
      app_role: ["citizen", "field_police", "higher_officer", "admin"],
    },
  },
} as const