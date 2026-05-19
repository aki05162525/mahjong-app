export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
