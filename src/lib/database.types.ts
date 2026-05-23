export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          owner_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          owner_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          created_at?: string;
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
      tables: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          created_at?: string;
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
      matches: {
        Row: {
          id: string;
          tournament_id: string;
          table_id: string;
          round_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          table_id: string;
          round_number: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          table_id?: string;
          round_number?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      match_results: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          score: number;
          rank: number;
          base_point: number;
          uma_point: number;
          total_point: number;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          score: number;
          rank: number;
          base_point: number;
          uma_point: number;
          total_point: number;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          score?: number;
          rank?: number;
          base_point?: number;
          uma_point?: number;
          total_point?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]?: never };
    Functions: { [_ in never]?: never };
    Enums: { [_ in never]?: never };
    CompositeTypes: { [_ in never]?: never };
  };
};
