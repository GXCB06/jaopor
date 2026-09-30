// Generated from the `mrrmafia` Supabase project (Supabase MCP `generate_typescript_types`).
// Do not edit by hand — regenerate after every migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      pixel_visitors: {
        Row: {
          day: string;
          net_hash: string;
          startup_id: number;
          visitor_hash: string;
        };
        Insert: {
          day: string;
          net_hash: string;
          startup_id: number;
          visitor_hash: string;
        };
        Update: {
          day?: string;
          net_hash?: string;
          startup_id?: number;
          visitor_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pixel_visitors_startup_id_fkey";
            columns: ["startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          handle: string | null;
          id: string;
          updated_at: string;
          x_handle: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          handle?: string | null;
          id: string;
          updated_at?: string;
          x_handle?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          handle?: string | null;
          id?: string;
          updated_at?: string;
          x_handle?: string | null;
        };
        Relationships: [];
      };
      provider_connections: {
        Row: {
          account_name: string | null;
          config: Json;
          created_at: string;
          encrypted_key: string | null;
          id: number;
          key_hint: string | null;
          last_error: string | null;
          last_synced_at: string | null;
          provider: string;
          startup_id: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          account_name?: string | null;
          config?: Json;
          created_at?: string;
          encrypted_key?: string | null;
          id?: never;
          key_hint?: string | null;
          last_error?: string | null;
          last_synced_at?: string | null;
          provider: string;
          startup_id: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          account_name?: string | null;
          config?: Json;
          created_at?: string;
          encrypted_key?: string | null;
          id?: never;
          key_hint?: string | null;
          last_error?: string | null;
          last_synced_at?: string | null;
          provider?: string;
          startup_id?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_connections_startup_id_fkey";
            columns: ["startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["id"];
          },
        ];
      };
      revenue_snapshots: {
        Row: {
          day: string;
          mrr_cents: number | null;
          revenue_cents: number;
          startup_id: number;
        };
        Insert: {
          day: string;
          mrr_cents?: number | null;
          revenue_cents?: number;
          startup_id: number;
        };
        Update: {
          day?: string;
          mrr_cents?: number | null;
          revenue_cents?: number;
          startup_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "revenue_snapshots_startup_id_fkey";
            columns: ["startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["id"];
          },
        ];
      };
      startups: {
        Row: {
          active_subscriptions: number | null;
          active_users: number | null;
          ai_tools: string[];
          app_store_url: string | null;
          audience: string | null;
          build_ai_commits: number | null;
          build_commits: number | null;
          build_first_commit_at: string | null;
          build_stars: number | null;
          build_stack: string[];
          build_story: string | null;
          build_synced_at: string | null;
          category: string;
          country: string;
          created_at: string;
          customers: number | null;
          description: string | null;
          founded_on: string | null;
          founder_message: string | null;
          founding_number: number | null;
          funding: string | null;
          github_repo: string | null;
          github_url: string | null;
          id: number;
          is_demo: boolean;
          last_synced_at: string | null;
          line_url: string | null;
          logo_path: string | null;
          looking_for: string[];
          marketing_channels: string[];
          mrr_cents: number | null;
          name: string;
          owner_id: string;
          play_store_url: string | null;
          pricing: string | null;
          problem_solved: string | null;
          province: string | null;
          revenue_30d_cents: number | null;
          revenue_all_time_cents: number | null;
          revenue_prev_30d_cents: number | null;
          slug: string;
          status: string;
          tagline: string | null;
          team_size: string | null;
          tech_stack: string[];
          traffic_provider: string | null;
          traffic_synced_at: string | null;
          updated_at: string;
          value_proposition: string | null;
          verification_status: string;
          verified_provider: string | null;
          visitors_30d: number | null;
          visitors_prev_30d: number | null;
          website_url: string | null;
        };
        Insert: {
          active_subscriptions?: number | null;
          active_users?: number | null;
          ai_tools?: string[];
          app_store_url?: string | null;
          audience?: string | null;
          build_ai_commits?: number | null;
          build_commits?: number | null;
          build_first_commit_at?: string | null;
          build_stars?: number | null;
          build_stack?: string[];
          build_story?: string | null;
          build_synced_at?: string | null;
          category?: string;
          country?: string;
          created_at?: string;
          customers?: number | null;
          description?: string | null;
          founded_on?: string | null;
          founder_message?: string | null;
          founding_number?: number | null;
          funding?: string | null;
          github_repo?: string | null;
          github_url?: string | null;
          id?: never;
          is_demo?: boolean;
          last_synced_at?: string | null;
          line_url?: string | null;
          logo_path?: string | null;
          looking_for?: string[];
          marketing_channels?: string[];
          mrr_cents?: number | null;
          name: string;
          owner_id: string;
          play_store_url?: string | null;
          pricing?: string | null;
          problem_solved?: string | null;
          province?: string | null;
          revenue_30d_cents?: number | null;
          revenue_all_time_cents?: number | null;
          revenue_prev_30d_cents?: number | null;
          slug: string;
          status?: string;
          tagline?: string | null;
          team_size?: string | null;
          tech_stack?: string[];
          traffic_provider?: string | null;
          traffic_synced_at?: string | null;
          updated_at?: string;
          value_proposition?: string | null;
          verification_status?: string;
          verified_provider?: string | null;
          visitors_30d?: number | null;
          visitors_prev_30d?: number | null;
          website_url?: string | null;
        };
        Update: {
          active_subscriptions?: number | null;
          active_users?: number | null;
          ai_tools?: string[];
          app_store_url?: string | null;
          audience?: string | null;
          build_ai_commits?: number | null;
          build_commits?: number | null;
          build_first_commit_at?: string | null;
          build_stars?: number | null;
          build_stack?: string[];
          build_story?: string | null;
          build_synced_at?: string | null;
          category?: string;
          country?: string;
          created_at?: string;
          customers?: number | null;
          description?: string | null;
          founded_on?: string | null;
          founder_message?: string | null;
          founding_number?: number | null;
          funding?: string | null;
          github_repo?: string | null;
          github_url?: string | null;
          id?: never;
          is_demo?: boolean;
          last_synced_at?: string | null;
          line_url?: string | null;
          logo_path?: string | null;
          looking_for?: string[];
          marketing_channels?: string[];
          mrr_cents?: number | null;
          name?: string;
          owner_id?: string;
          play_store_url?: string | null;
          pricing?: string | null;
          problem_solved?: string | null;
          province?: string | null;
          revenue_30d_cents?: number | null;
          revenue_all_time_cents?: number | null;
          revenue_prev_30d_cents?: number | null;
          slug?: string;
          status?: string;
          tagline?: string | null;
          team_size?: string | null;
          tech_stack?: string[];
          traffic_provider?: string | null;
          traffic_synced_at?: string | null;
          updated_at?: string;
          value_proposition?: string | null;
          verification_status?: string;
          verified_provider?: string | null;
          visitors_30d?: number | null;
          visitors_prev_30d?: number | null;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "startups_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      traffic_snapshots: {
        Row: {
          day: string;
          startup_id: number;
          visitors: number;
        };
        Insert: {
          day: string;
          startup_id: number;
          visitors?: number;
        };
        Update: {
          day?: string;
          startup_id?: number;
          visitors?: number;
        };
        Relationships: [
          {
            foreignKeyName: "traffic_snapshots_startup_id_fkey";
            columns: ["startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
