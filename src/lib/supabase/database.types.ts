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
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      build_activity: {
        Row: {
          commits: number;
          day: string;
          startup_id: number;
        };
        Insert: {
          commits: number;
          day: string;
          startup_id: number;
        };
        Update: {
          commits?: number;
          day?: string;
          startup_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "build_activity_startup_id_fkey";
            columns: ["startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_requests: {
        Row: {
          created_at: string;
          from_id: string;
          id: number;
          message: string;
          responded_at: string | null;
          status: string;
          to_id: string;
          topic: string;
        };
        Insert: {
          created_at?: string;
          from_id: string;
          id?: never;
          message: string;
          responded_at?: string | null;
          status?: string;
          to_id: string;
          topic: string;
        };
        Update: {
          created_at?: string;
          from_id?: string;
          id?: never;
          message?: string;
          responded_at?: string | null;
          status?: string;
          to_id?: string;
          topic?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_requests_from_id_fkey";
            columns: ["from_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_requests_to_id_fkey";
            columns: ["to_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fx_rates: {
        Row: {
          day: string;
          fetched_at: string;
          source: string;
          usd_thb: number;
        };
        Insert: {
          day: string;
          fetched_at?: string;
          source?: string;
          usd_thb: number;
        };
        Update: {
          day?: string;
          fetched_at?: string;
          source?: string;
          usd_thb?: number;
        };
        Relationships: [];
      };
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
      positions: {
        Row: {
          company: string | null;
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: number;
          position: number;
          start_date: string;
          title: string;
          user_id: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: never;
          position?: number;
          start_date: string;
          title: string;
          user_id: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: never;
          position?: number;
          start_date?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "positions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      private_contacts: {
        Row: {
          email: string | null;
          line_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          email?: string | null;
          line_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          email?: string | null;
          line_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "private_contacts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_skills: {
        Row: {
          is_superpower: boolean;
          position: number;
          skill_slug: string;
          user_id: string;
        };
        Insert: {
          is_superpower?: boolean;
          position?: number;
          skill_slug: string;
          user_id: string;
        };
        Update: {
          is_superpower?: boolean;
          position?: number;
          skill_slug?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_skills_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_views: {
        Row: {
          day: string;
          profile_id: string;
          viewer_hash: string;
        };
        Insert: {
          day: string;
          profile_id: string;
          viewer_hash: string;
        };
        Update: {
          day?: string;
          profile_id?: string;
          viewer_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          field_visibility: Json;
          handle: string | null;
          headline: string | null;
          id: string;
          looking_for: Json;
          province: string | null;
          show_in_directory: boolean;
          social_links: Json;
          status: string;
          updated_at: string;
          x_handle: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          field_visibility?: Json;
          handle?: string | null;
          headline?: string | null;
          id: string;
          looking_for?: Json;
          province?: string | null;
          show_in_directory?: boolean;
          social_links?: Json;
          status?: string;
          updated_at?: string;
          x_handle?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          field_visibility?: Json;
          handle?: string | null;
          headline?: string | null;
          id?: string;
          looking_for?: Json;
          province?: string | null;
          show_in_directory?: boolean;
          social_links?: Json;
          status?: string;
          updated_at?: string;
          x_handle?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_province_fkey";
            columns: ["province"];
            isOneToOne: false;
            referencedRelation: "provinces";
            referencedColumns: ["slug"];
          },
        ];
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
      provinces: {
        Row: {
          name_en: string;
          name_th: string;
          region: string;
          slug: string;
        };
        Insert: {
          name_en: string;
          name_th: string;
          region: string;
          slug: string;
        };
        Update: {
          name_en?: string;
          name_th?: string;
          region?: string;
          slug?: string;
        };
        Relationships: [];
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
      startup_members: {
        Row: {
          created_at: string;
          invited_by: string;
          pinned_position: number | null;
          role: string;
          startup_id: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          invited_by: string;
          pinned_position?: number | null;
          role: string;
          startup_id: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          invited_by?: string;
          pinned_position?: number | null;
          role?: string;
          startup_id?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "startup_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "startup_members_startup_id_fkey";
            columns: ["startup_id"];
            isOneToOne: false;
            referencedRelation: "startups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "startup_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      startup_screenshots: {
        Row: {
          caption: string | null;
          created_at: string;
          height: number;
          id: number;
          kind: string;
          path: string;
          position: number;
          startup_id: number;
          width: number;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          height: number;
          id?: never;
          kind: string;
          path: string;
          position?: number;
          startup_id: number;
          width: number;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          height?: number;
          id?: never;
          kind?: string;
          path?: string;
          position?: number;
          startup_id?: number;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "startup_screenshots_startup_id_fkey";
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
          build_stack: string[];
          build_stars: number | null;
          build_story: string | null;
          build_synced_at: string | null;
          category: string;
          country: string;
          created_at: string;
          customers: number | null;
          demo_video_url: string | null;
          description: string | null;
          founded_on: string | null;
          founder_message: string | null;
          founder_role: string | null;
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
          pricing_amount: number | null;
          pricing_currency: string | null;
          pricing_note: string | null;
          pricing_period: string | null;
          problem_solved: string | null;
          province: string | null;
          revenue_30d_cents: number | null;
          revenue_all_time_cents: number | null;
          revenue_prev_30d_cents: number | null;
          slug: string;
          status: string;
          tagline: string | null;
          team_size: string | null;
          tech_stack: Json;
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
          build_stack?: string[];
          build_stars?: number | null;
          build_story?: string | null;
          build_synced_at?: string | null;
          category?: string;
          country?: string;
          created_at?: string;
          customers?: number | null;
          demo_video_url?: string | null;
          description?: string | null;
          founded_on?: string | null;
          founder_message?: string | null;
          founder_role?: string | null;
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
          pricing_amount?: number | null;
          pricing_currency?: string | null;
          pricing_note?: string | null;
          pricing_period?: string | null;
          problem_solved?: string | null;
          province?: string | null;
          revenue_30d_cents?: number | null;
          revenue_all_time_cents?: number | null;
          revenue_prev_30d_cents?: number | null;
          slug: string;
          status?: string;
          tagline?: string | null;
          team_size?: string | null;
          tech_stack?: Json;
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
          build_stack?: string[];
          build_stars?: number | null;
          build_story?: string | null;
          build_synced_at?: string | null;
          category?: string;
          country?: string;
          created_at?: string;
          customers?: number | null;
          demo_video_url?: string | null;
          description?: string | null;
          founded_on?: string | null;
          founder_message?: string | null;
          founder_role?: string | null;
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
          pricing_amount?: number | null;
          pricing_currency?: string | null;
          pricing_note?: string | null;
          pricing_period?: string | null;
          problem_solved?: string | null;
          province?: string | null;
          revenue_30d_cents?: number | null;
          revenue_all_time_cents?: number | null;
          revenue_prev_30d_cents?: number | null;
          slug?: string;
          status?: string;
          tagline?: string | null;
          team_size?: string | null;
          tech_stack?: Json;
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
          {
            foreignKeyName: "startups_province_fkey";
            columns: ["province"];
            isOneToOne: false;
            referencedRelation: "provinces";
            referencedColumns: ["slug"];
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
      user_reports: {
        Row: {
          created_at: string;
          id: number;
          note: string | null;
          reason: string;
          reported_id: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          note?: string | null;
          reason: string;
          reported_id: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          note?: string | null;
          reason?: string;
          reported_id?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_id_fkey";
            columns: ["reported_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      category_counts: {
        Args: never;
        Returns: {
          category: string;
          startups: number;
        }[];
      };
      get_profile: {
        Args: { p_handle: string; p_viewer?: string };
        Returns: Json;
      };
      handle_available: { Args: { p_handle: string }; Returns: boolean };
      profile_activity: {
        Args: {
          p_from: string;
          p_to: string;
          p_user: string;
          p_viewer?: string;
        };
        Returns: {
          day: string;
          score: number;
        }[];
      };
      province_leaderboard: {
        Args: { metric?: string; region?: string };
        Returns: {
          province: string;
          region_slug: string;
          startups: number;
          top: Json;
          total: number;
        }[];
      };
      refresh_activity: { Args: never; Returns: undefined };
      search_startups: {
        Args: { max_rows?: number; q: string };
        Returns: {
          category: string;
          id: number;
          is_demo: boolean;
          logo_path: string;
          mrr_cents: number;
          name: string;
          slug: string;
          tagline: string;
          verification_status: string;
          verified_provider: string;
        }[];
      };
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
