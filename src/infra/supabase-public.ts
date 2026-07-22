import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// クッキー(セッション)を必要としない、読み取り専用のサーバーサイド利用向け。
// matches/tournaments 等は RLS で全件 select 許可されているため anon key で十分。
let _instance: SupabaseClient<Database> | null = null;

export function getSupabasePublic(): SupabaseClient<Database> {
  if (!_instance) {
    _instance = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _instance;
}
