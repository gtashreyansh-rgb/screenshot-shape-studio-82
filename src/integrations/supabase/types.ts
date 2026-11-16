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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_provider_configs: {
        Row: {
          base_url: string | null
          capability: string
          created_at: string
          created_by: string
          default_model: string
          id: string
          key_hint: string | null
          label: string
          last_error: string | null
          last_tested_at: string | null
          provider: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          base_url?: string | null
          capability?: string
          created_at?: string
          created_by: string
          default_model: string
          id?: string
          key_hint?: string | null
          label: string
          last_error?: string | null
          last_tested_at?: string | null
          provider: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          base_url?: string | null
          capability?: string
          created_at?: string
          created_by?: string
          default_model?: string
          id?: string
          key_hint?: string | null
          label?: string
          last_error?: string | null
          last_tested_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_secrets: {
        Row: {
          ciphertext: string
          config_id: string
          updated_at: string
        }
        Insert: {
          ciphertext: string
          config_id: string
          updated_at?: string
        }
        Update: {
          ciphertext?: string
          config_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_secrets_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: true
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          created_at: string
          created_by: string
          error_message: string | null
          feature: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string
          output_tokens: number | null
          provider_config_id: string | null
          provider_label: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error_message?: string | null
          feature: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          provider_config_id?: string | null
          provider_label: string
          status: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          provider_config_id?: string | null
          provider_label?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_provider_config_id_fkey"
            columns: ["provider_config_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_workspace_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_workspace_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_workspace_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          audience: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          generated_with: string | null
          hook: string | null
          id: string
          language: string
          model: string | null
          outro: string | null
          scenes: Json
          title: string
          tone: string
          topic: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number
          generated_with?: string | null
          hook?: string | null
          id?: string
          language?: string
          model?: string | null
          outro?: string | null
          scenes?: Json
          title: string
          tone?: string
          topic: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          generated_with?: string | null
          hook?: string | null
          id?: string
          language?: string
          model?: string | null
          outro?: string | null
          scenes?: Json
          title?: string
          tone?: string
          topic?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_packages: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          generated_with: string | null
          hashtags: Json
          id: string
          keywords: Json
          language: string
          model: string | null
          tags: Json
          titles: Json
          topic: string
          updated_at: string
          upload_tips: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          generated_with?: string | null
          hashtags?: Json
          id?: string
          keywords?: Json
          language?: string
          model?: string | null
          tags?: Json
          titles?: Json
          topic: string
          updated_at?: string
          upload_tips?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          generated_with?: string | null
          hashtags?: Json
          id?: string
          keywords?: Json
          language?: string
          model?: string | null
          tags?: Json
          titles?: Json
          topic?: string
          updated_at?: string
          upload_tips?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_packages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          default_language: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_language?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_language?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["workspace_role"][]
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      shares_workspace_with: { Args: { _other: string }; Returns: boolean }
    }
    Enums: {
      workspace_role: "owner" | "admin" | "editor" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      workspace_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
