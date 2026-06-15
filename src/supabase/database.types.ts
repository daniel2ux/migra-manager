// Auto-generated — não edite manualmente. Rode: npm run db:gen-types

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
  private: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: { Args: never; Returns: string }
      has_project_access: { Args: { p_project_id: string }; Returns: boolean }
      is_admin_or_master: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_profiles: {
        Row: {
          created_at: string
          description: string
          id: string
          is_system: boolean
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      activity_groups: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          name: string
          object_ids: string[]
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name: string
          object_ids?: string[]
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          object_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      charge_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          name: string
          object_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name: string
          object_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          object_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          updated_by_name: string | null
          updated_by_uid: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by_name?: string | null
          updated_by_uid?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by_name?: string | null
          updated_by_uid?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string
          id: string
          object_id: string | null
          object_name: string | null
          project_id: string | null
          text: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          object_id?: string | null
          object_name?: string | null
          project_id?: string | null
          text: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          object_id?: string | null
          object_name?: string | null
          project_id?: string | null
          text?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "migration_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      edit_locks: {
        Row: {
          expires_at: string
          id: string
          locked_at: string
          resource_id: string
          user_email: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          expires_at?: string
          id: string
          locked_at?: string
          resource_id: string
          user_email?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          expires_at?: string
          id?: string
          locked_at?: string
          resource_id?: string
          user_email?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      email_contacts: {
        Row: {
          created_at: string
          created_by_uid: string | null
          email: string
          group_ids: string[]
          id: string
          name: string
          updated_at: string
          updated_by_uid: string | null
        }
        Insert: {
          created_at?: string
          created_by_uid?: string | null
          email: string
          group_ids?: string[]
          id?: string
          name: string
          updated_at?: string
          updated_by_uid?: string | null
        }
        Update: {
          created_at?: string
          created_by_uid?: string | null
          email?: string
          group_ids?: string[]
          id?: string
          name?: string
          updated_at?: string
          updated_by_uid?: string | null
        }
        Relationships: []
      }
      email_groups: {
        Row: {
          created_at: string
          created_by_uid: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          updated_by_uid: string | null
        }
        Insert: {
          created_at?: string
          created_by_uid?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by_uid?: string | null
        }
        Update: {
          created_at?: string
          created_by_uid?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by_uid?: string | null
        }
        Relationships: []
      }
      file_aliases: {
        Row: {
          created_at: string
          created_by: string | null
          file_name_patterns: string[]
          id: string
          object_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name_patterns?: string[]
          id?: string
          object_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name_patterns?: string[]
          id?: string
          object_name?: string
        }
        Relationships: []
      }
      master_objects: {
        Row: {
          activity_group_ids: string[]
          charge_group: string | null
          charge_order: string | null
          created_at: string
          dependency_ids: string[]
          description: string | null
          external_dependencies: string[]
          id: string
          is_parallel: boolean | null
          name: string
          owner_id: string | null
          parallel_order: string | null
          status: Database["public"]["Enums"]["master_object_status"] | null
          type: Database["public"]["Enums"]["master_object_type"] | null
          updated_at: string
        }
        Insert: {
          activity_group_ids?: string[]
          charge_group?: string | null
          charge_order?: string | null
          created_at?: string
          dependency_ids?: string[]
          description?: string | null
          external_dependencies?: string[]
          id?: string
          is_parallel?: boolean | null
          name: string
          owner_id?: string | null
          parallel_order?: string | null
          status?: Database["public"]["Enums"]["master_object_status"] | null
          type?: Database["public"]["Enums"]["master_object_type"] | null
          updated_at?: string
        }
        Update: {
          activity_group_ids?: string[]
          charge_group?: string | null
          charge_order?: string | null
          created_at?: string
          dependency_ids?: string[]
          description?: string | null
          external_dependencies?: string[]
          id?: string
          is_parallel?: boolean | null
          name?: string
          owner_id?: string | null
          parallel_order?: string | null
          status?: Database["public"]["Enums"]["master_object_status"] | null
          type?: Database["public"]["Enums"]["master_object_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      migration_logs: {
        Row: {
          created_at: string
          error_id: string | null
          error_number: string | null
          filename: string
          id: string
          imported_at: string
          info_key: string | null
          message: string
          mock: string
          object: string
          old_key: string | null
          project_id: string | null
          seq: number
          source_file_name: string | null
          started_at: string
          status: Database["public"]["Enums"]["migration_log_status"]
          username: string | null
        }
        Insert: {
          created_at?: string
          error_id?: string | null
          error_number?: string | null
          filename: string
          id?: string
          imported_at?: string
          info_key?: string | null
          message?: string
          mock: string
          object: string
          old_key?: string | null
          project_id?: string | null
          seq?: number
          source_file_name?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["migration_log_status"]
          username?: string | null
        }
        Update: {
          created_at?: string
          error_id?: string | null
          error_number?: string | null
          filename?: string
          id?: string
          imported_at?: string
          info_key?: string | null
          message?: string
          mock?: string
          object?: string
          old_key?: string | null
          project_id?: string | null
          seq?: number
          source_file_name?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["migration_log_status"]
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "migration_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_objects: {
        Row: {
          charge_end_time: string | null
          charge_group: string | null
          charge_order: string | null
          charge_start_time: string | null
          created_at: string
          current_charge_duration_ms: number
          dependency_ids: string[]
          description: string | null
          error_records_count: number
          has_tech_logs: boolean | null
          id: string
          initial_charge_end_time: string | null
          initial_charge_start_time: string | null
          is_active: boolean
          is_parallel: boolean | null
          load_history: Json
          master_object_id: string | null
          migrated_records_count: number
          mock_id: string
          name: string
          owner_id: string | null
          parallel_order: string | null
          previous_charge_duration_ms: number
          previous_migrated_records_count: number
          processed_records_count: number
          project_id: string
          status: Database["public"]["Enums"]["migration_object_status"] | null
          successful_records_count: number
          target_records_count: number
          updated_at: string
        }
        Insert: {
          charge_end_time?: string | null
          charge_group?: string | null
          charge_order?: string | null
          charge_start_time?: string | null
          created_at?: string
          current_charge_duration_ms?: number
          dependency_ids?: string[]
          description?: string | null
          error_records_count?: number
          has_tech_logs?: boolean | null
          id?: string
          initial_charge_end_time?: string | null
          initial_charge_start_time?: string | null
          is_active?: boolean
          is_parallel?: boolean | null
          load_history?: Json
          master_object_id?: string | null
          migrated_records_count?: number
          mock_id: string
          name: string
          owner_id?: string | null
          parallel_order?: string | null
          previous_charge_duration_ms?: number
          previous_migrated_records_count?: number
          processed_records_count?: number
          project_id: string
          status?: Database["public"]["Enums"]["migration_object_status"] | null
          successful_records_count?: number
          target_records_count?: number
          updated_at?: string
        }
        Update: {
          charge_end_time?: string | null
          charge_group?: string | null
          charge_order?: string | null
          charge_start_time?: string | null
          created_at?: string
          current_charge_duration_ms?: number
          dependency_ids?: string[]
          description?: string | null
          error_records_count?: number
          has_tech_logs?: boolean | null
          id?: string
          initial_charge_end_time?: string | null
          initial_charge_start_time?: string | null
          is_active?: boolean
          is_parallel?: boolean | null
          load_history?: Json
          master_object_id?: string | null
          migrated_records_count?: number
          mock_id?: string
          name?: string
          owner_id?: string | null
          parallel_order?: string | null
          previous_charge_duration_ms?: number
          previous_migrated_records_count?: number
          processed_records_count?: number
          project_id?: string
          status?: Database["public"]["Enums"]["migration_object_status"] | null
          successful_records_count?: number
          target_records_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_objects_master_object_id_fkey"
            columns: ["master_object_id"]
            isOneToOne: false
            referencedRelation: "master_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_objects_mock_id_fkey"
            columns: ["mock_id"]
            isOneToOne: false
            referencedRelation: "mocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mocks: {
        Row: {
          created_at: string
          data_fim_carga: string | null
          data_inicio_carga: string | null
          end_date: string | null
          explanatory_text: string | null
          id: string
          is_locked: boolean
          is_running: boolean | null
          load_history: Json
          locked_by_master: boolean | null
          locked_by_name: string | null
          locked_by_uid: string | null
          name: string
          project_id: string
          quantity_existing_objects: number
          slug: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim_carga?: string | null
          data_inicio_carga?: string | null
          end_date?: string | null
          explanatory_text?: string | null
          id?: string
          is_locked?: boolean
          is_running?: boolean | null
          load_history?: Json
          locked_by_master?: boolean | null
          locked_by_name?: string | null
          locked_by_uid?: string | null
          name: string
          project_id: string
          quantity_existing_objects?: number
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim_carga?: string | null
          data_inicio_carga?: string | null
          end_date?: string | null
          explanatory_text?: string | null
          id?: string
          is_locked?: boolean
          is_running?: boolean | null
          load_history?: Json
          locked_by_master?: boolean | null
          locked_by_name?: string | null
          locked_by_uid?: string | null
          name?: string
          project_id?: string
          quantity_existing_objects?: number
          slug?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_profile_id: string | null
          company: string | null
          created_at: string
          department: string | null
          email: string
          email_signatures: Json
          end_date: string | null
          from_email: string | null
          id: string
          is_disabled: boolean
          is_master: boolean
          manager: string | null
          migrador_name: string | null
          must_change_password: boolean
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          project_ids: string[]
          project_order: string[]
          role: Database["public"]["Enums"]["user_role"]
          start_date: string | null
          updated_at: string
        }
        Insert: {
          access_profile_id?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          email?: string
          email_signatures?: Json
          end_date?: string | null
          from_email?: string | null
          id: string
          is_disabled?: boolean
          is_master?: boolean
          manager?: string | null
          migrador_name?: string | null
          must_change_password?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          project_ids?: string[]
          project_order?: string[]
          role?: Database["public"]["Enums"]["user_role"]
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          access_profile_id?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          email?: string
          email_signatures?: Json
          end_date?: string | null
          from_email?: string | null
          id?: string
          is_disabled?: boolean
          is_master?: boolean
          manager?: string | null
          migrador_name?: string | null
          must_change_password?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          project_ids?: string[]
          project_order?: string[]
          role?: Database["public"]["Enums"]["user_role"]
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          company: string | null
          created_at: string
          description: string | null
          id: string
          is_locked: boolean
          locked_by_master: boolean
          locked_by_name: string | null
          locked_by_uid: string | null
          member_profiles: Json
          member_uids: string[]
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          locked_by_master?: boolean
          locked_by_name?: string | null
          locked_by_uid?: string | null
          member_profiles?: Json
          member_uids?: string[]
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          locked_by_master?: boolean
          locked_by_name?: string | null
          locked_by_uid?: string | null
          member_profiles?: Json
          member_uids?: string[]
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          id: string
          is_online: boolean
          last_seen: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      master_object_status: "ATIVO" | "INATIVO" | "LEGACY"
      master_object_type: "MASTER" | "TRANSACTIONAL" | "TECHNICAL" | "SCRIPT"
      migration_log_status: "ERROR" | "WARN" | "INFO" | "OK"
      migration_object_status:
        | "PENDENTE"
        | "CARGA_EM_ANDAMENTO"
        | "CARGA_CONCLUIDA"
      user_role: "master" | "admin" | "especialista" | "membro"
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
  private: {
    Enums: {},
  },
  public: {
    Enums: {
      master_object_status: ["ATIVO", "INATIVO", "LEGACY"],
      master_object_type: ["MASTER", "TRANSACTIONAL", "TECHNICAL", "SCRIPT"],
      migration_log_status: ["ERROR", "WARN", "INFO", "OK"],
      migration_object_status: [
        "PENDENTE",
        "CARGA_EM_ANDAMENTO",
        "CARGA_CONCLUIDA",
      ],
      user_role: ["master", "admin", "especialista", "membro"],
    },
  },
} as const
