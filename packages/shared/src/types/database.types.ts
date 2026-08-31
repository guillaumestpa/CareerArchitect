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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
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
      ads: {
        Row: {
          company_id: string
          created_at: string
          dedup_key: string
          first_seen_at: string
          id: string
          last_seen_at: string
          raw_content: string
          stale_at: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dedup_key: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          raw_content: string
          stale_at?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dedup_key?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          raw_content?: string
          stale_at?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_achievements: {
        Row: {
          created_at: string
          description: string | null
          evidence_ad_id: string | null
          evidence_category: string | null
          id: string
          occurred_on: string | null
          provenance: Database["public"]["Enums"]["capital_provenance"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          occurred_on?: string | null
          provenance: Database["public"]["Enums"]["capital_provenance"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          occurred_on?: string | null
          provenance?: Database["public"]["Enums"]["capital_provenance"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_achievements_evidence_ad_id_fkey"
            columns: ["evidence_ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_education: {
        Row: {
          created_at: string
          credential: string | null
          ended_on: string | null
          evidence_ad_id: string | null
          evidence_category: string | null
          field_of_study: string | null
          id: string
          institution: string
          provenance: Database["public"]["Enums"]["capital_provenance"]
          started_on: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential?: string | null
          ended_on?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          field_of_study?: string | null
          id?: string
          institution: string
          provenance: Database["public"]["Enums"]["capital_provenance"]
          started_on?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential?: string | null
          ended_on?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string
          provenance?: Database["public"]["Enums"]["capital_provenance"]
          started_on?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_education_evidence_ad_id_fkey"
            columns: ["evidence_ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_experiences: {
        Row: {
          created_at: string
          description: string | null
          ended_on: string | null
          evidence_ad_id: string | null
          evidence_category: string | null
          id: string
          is_current: boolean
          organization: string | null
          provenance: Database["public"]["Enums"]["capital_provenance"]
          started_on: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_on?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          is_current?: boolean
          organization?: string | null
          provenance: Database["public"]["Enums"]["capital_provenance"]
          started_on?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_on?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          is_current?: boolean
          organization?: string | null
          provenance?: Database["public"]["Enums"]["capital_provenance"]
          started_on?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_experiences_evidence_ad_id_fkey"
            columns: ["evidence_ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_projects: {
        Row: {
          created_at: string
          description: string | null
          ended_on: string | null
          evidence_ad_id: string | null
          evidence_category: string | null
          id: string
          name: string
          provenance: Database["public"]["Enums"]["capital_provenance"]
          started_on: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_on?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          name: string
          provenance: Database["public"]["Enums"]["capital_provenance"]
          started_on?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_on?: string | null
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          name?: string
          provenance?: Database["public"]["Enums"]["capital_provenance"]
          started_on?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_projects_evidence_ad_id_fkey"
            columns: ["evidence_ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_skills: {
        Row: {
          category: string | null
          created_at: string
          evidence_ad_id: string | null
          evidence_category: string | null
          id: string
          name: string
          provenance: Database["public"]["Enums"]["capital_provenance"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          name: string
          provenance: Database["public"]["Enums"]["capital_provenance"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          evidence_ad_id?: string | null
          evidence_category?: string | null
          id?: string
          name?: string
          provenance?: Database["public"]["Enums"]["capital_provenance"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_skills_evidence_ad_id_fkey"
            columns: ["evidence_ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      career_target_industries: {
        Row: {
          career_target_id: string
          created_at: string
          id: string
          industry_id: string
        }
        Insert: {
          career_target_id: string
          created_at?: string
          id?: string
          industry_id: string
        }
        Update: {
          career_target_id?: string
          created_at?: string
          id?: string
          industry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_target_industries_career_target_id_fkey"
            columns: ["career_target_id"]
            isOneToOne: false
            referencedRelation: "career_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_target_industries_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      career_target_locations: {
        Row: {
          career_target_id: string
          city: string | null
          country_code: string
          id: string
        }
        Insert: {
          career_target_id: string
          city?: string | null
          country_code: string
          id?: string
        }
        Update: {
          career_target_id?: string
          city?: string | null
          country_code?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_target_locations_career_target_id_fkey"
            columns: ["career_target_id"]
            isOneToOne: false
            referencedRelation: "career_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      career_targets: {
        Row: {
          created_at: string
          employee_count_buckets: Database["public"]["Enums"]["employee_count_bucket"][]
          id: string
          publicly_traded: boolean | null
          remote_policies: Database["public"]["Enums"]["remote_policy"][]
          required_certifications: Database["public"]["Enums"]["certification"][]
          revenue_buckets: Database["public"]["Enums"]["revenue_bucket"][]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_count_buckets?: Database["public"]["Enums"]["employee_count_bucket"][]
          id?: string
          publicly_traded?: boolean | null
          remote_policies?: Database["public"]["Enums"]["remote_policy"][]
          required_certifications?: Database["public"]["Enums"]["certification"][]
          revenue_buckets?: Database["public"]["Enums"]["revenue_bucket"][]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_count_buckets?: Database["public"]["Enums"]["employee_count_bucket"][]
          id?: string
          publicly_traded?: boolean | null
          remote_policies?: Database["public"]["Enums"]["remote_policy"][]
          required_certifications?: Database["public"]["Enums"]["certification"][]
          revenue_buckets?: Database["public"]["Enums"]["revenue_bucket"][]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cover_letter_drafts: {
        Row: {
          ad_id: string
          created_at: string
          current_content: string
          id: string
          initial_content: string
          locked_at: string | null
          updated_at: string
          user_id: string
          word_diff_count: number | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          current_content: string
          id?: string
          initial_content: string
          locked_at?: string | null
          updated_at?: string
          user_id: string
          word_diff_count?: number | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          current_content?: string
          id?: string
          initial_content?: string
          locked_at?: string | null
          updated_at?: string
          user_id?: string
          word_diff_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cover_letter_drafts_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      resume_drafts: {
        Row: {
          ad_id: string
          created_at: string
          current_content: string
          id: string
          initial_content: string
          locked_at: string | null
          updated_at: string
          user_id: string
          word_diff_count: number | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          current_content: string
          id?: string
          initial_content: string
          locked_at?: string | null
          updated_at?: string
          user_id: string
          word_diff_count?: number | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          current_content?: string
          id?: string
          initial_content?: string
          locked_at?: string | null
          updated_at?: string
          user_id?: string
          word_diff_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_drafts_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ad_status: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["user_ad_status_value"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          status: Database["public"]["Enums"]["user_ad_status_value"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["user_ad_status_value"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ad_status_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
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
      capital_provenance:
        | "ad_confirmed"
        | "aggregate_inferred"
        | "cold_start_inferred"
        | "user_volunteered"
      certification: "b_corp" | "great_place_to_work" | "gender_equality_index"
      employee_count_bucket:
        | "1-10"
        | "11-50"
        | "51-200"
        | "201-500"
        | "501-1000"
        | "1001-5000"
        | "5000+"
      remote_policy:
        | "fully_remote"
        | "hybrid_fixed_days"
        | "hybrid_flexible"
        | "onsite_only"
      revenue_bucket:
        | "under_10m"
        | "10m_50m"
        | "50m_250m"
        | "250m_1b"
        | "1b_10b"
        | "10b_plus"
      user_ad_status_value: "inspected" | "interacted" | "applied" | "dismissed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      capital_provenance: [
        "ad_confirmed",
        "aggregate_inferred",
        "cold_start_inferred",
        "user_volunteered",
      ],
      certification: ["b_corp", "great_place_to_work", "gender_equality_index"],
      employee_count_bucket: [
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "501-1000",
        "1001-5000",
        "5000+",
      ],
      remote_policy: [
        "fully_remote",
        "hybrid_fixed_days",
        "hybrid_flexible",
        "onsite_only",
      ],
      revenue_bucket: [
        "under_10m",
        "10m_50m",
        "50m_250m",
        "250m_1b",
        "1b_10b",
        "10b_plus",
      ],
      user_ad_status_value: ["inspected", "interacted", "applied", "dismissed"],
    },
  },
} as const
