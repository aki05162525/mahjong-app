import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// クッキー(セッション)を必要としない、読み取り専用のサーバーサイド利用向け。
// matches/tournaments 等は RLS で全件 select 許可されているため anon key で十分。
let _instance: SupabaseClient<Database> | null = null;

// このクライアントは今のところ opengraph-image (revalidate = 300) 専用。
// supabase-js は fetch に Next.js の cache オプションを渡す手段を提供しないため、
// global.fetch を差し替えて明示的に next.revalidate を注入する。
// これがないと fetch はデフォルトで無キャッシュになり、呼び出し元の revalidate export が
// 効かず、クローラーが来るたびに Supabase への問い合わせが毎回発生してしまう。
const REVALIDATE_SECONDS = 300;

export function getSupabasePublic(): SupabaseClient<Database> {
  if (!_instance) {
    _instance = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, next: { revalidate: REVALIDATE_SECONDS } }),
        },
      }
    );
  }
  return _instance;
}
