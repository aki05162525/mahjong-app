export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
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
      match_results: {
        Row: {
          base_point: number;
          id: string;
          match_id: string;
          oka_point: number;
          player_id: string;
          rank: number;
          score: number;
          total_point: number;
          tournament_id: string;
          uma_point: number;
        };
        Insert: {
          base_point: number;
          id?: string;
          match_id: string;
          oka_point?: number;
          player_id: string;
          rank: number;
          score: number;
          total_point: number;
          tournament_id: string;
          uma_point: number;
        };
        Update: {
          base_point?: number;
          id?: string;
          match_id?: string;
          oka_point?: number;
          player_id?: string;
          rank?: number;
          score?: number;
          total_point?: number;
          tournament_id?: string;
          uma_point?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_tournament_id_fkey";
            columns: ["match_id", "tournament_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id", "tournament_id"];
          },
          {
            foreignKeyName: "match_results_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          id: string;
          return_points: number;
          round_number: number;
          rule_id: string | null;
          table_id: string | null;
          tournament_id: string;
          uma: number[];
        };
        Insert: {
          created_at?: string;
          id?: string;
          return_points: number;
          round_number: number;
          rule_id?: string | null;
          table_id?: string | null;
          tournament_id: string;
          uma: number[];
        };
        Update: {
          created_at?: string;
          id?: string;
          return_points?: number;
          round_number?: number;
          rule_id?: string | null;
          table_id?: string | null;
          tournament_id?: string;
          uma?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "matches_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_table_in_tournament";
            columns: ["tournament_id", "table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["tournament_id", "id"];
          },
          {
            foreignKeyName: "matches_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          tournament_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          tournament_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          tournament_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      rules: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          return_points: number;
          tournament_id: string;
          uma: number[];
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          return_points: number;
          tournament_id: string;
          uma: number[];
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          return_points?: number;
          tournament_id?: string;
          uma?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "rules_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tables: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          tournament_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          tournament_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          tournament_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tables_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_write_secrets: {
        Row: {
          created_at: string;
          token_hash: string;
          tournament_id: string;
        };
        Insert: {
          created_at?: string;
          token_hash: string;
          tournament_id: string;
        };
        Update: {
          created_at?: string;
          token_hash?: string;
          tournament_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_write_secrets_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: true;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournaments: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_match_with_results: {
        Args: {
          p_results: Json;
          p_return_points: number;
          p_round_number: number;
          p_rule_id: string;
          p_table_id?: string;
          p_tournament_id: string;
          p_uma: number[];
        };
        Returns: string;
      };
      create_rule_atomic: {
        Args: {
          p_is_default: boolean;
          p_name: string;
          p_return_points: number;
          p_tournament_id: string;
          p_uma: number[];
        };
        Returns: string;
      };
      delete_match_and_renumber: {
        Args: { p_match_id: string; p_tournament_id: string };
        Returns: undefined;
      };
      delete_rule_if_not_default: {
        Args: { p_rule_id: string; p_tournament_id: string };
        Returns: string;
      };
      update_rule_atomic: {
        Args: {
          p_is_default?: boolean;
          p_name: string;
          p_return_points: number;
          p_rule_id: string;
          p_tournament_id: string;
          p_uma: number[];
        };
        Returns: string;
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
