import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Match } from "@/lib/types";

export const MATCH_SELECT = `
  id,
  round_number,
  created_at,
  uma,
  return_points,
  tables!matches_table_id_fkey(name),
  match_results(
    player_id,
    score,
    rank,
    base_point,
    uma_point,
    oka_point,
    total_point,
    players(name)
  )
` as const;

export type SupabaseMatch = {
  id: string;
  round_number: number;
  created_at: string;
  uma: number[];
  return_points: number;
  "tables!matches_table_id_fkey": { name: string } | null;
  match_results: Array<{
    player_id: string;
    score: number;
    rank: number;
    base_point: number;
    uma_point: number;
    oka_point: number;
    total_point: number;
    players: { name: string } | null;
  }>;
};

export function toMatch(row: SupabaseMatch): Match {
  return {
    id: row.id,
    roundNumber: row.round_number,
    tableName: row["tables!matches_table_id_fkey"]?.name ?? "",
    createdAt: new Date(row.created_at),
    uma: row.uma,
    returnPoints: row.return_points,
    results: (row.match_results ?? []).map((r) => ({
      playerId: r.player_id,
      playerName: r.players?.name ?? "",
      score: r.score,
      rank: r.rank,
      basePoint: r.base_point,
      umaPoint: r.uma_point,
      okaPoint: r.oka_point,
      totalPoint: r.total_point,
    })),
  };
}

// .then() を呼ぶタイミングを呼び出し元に委ねるため、クエリビルダーをそのまま返す
// （useMatches は差分更新のため単一の .then() チェーンを保つ必要がある）。
export function matchesQuery(supabase: SupabaseClient<Database>, tournamentId: string) {
  return (
    supabase
      .from("matches")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select(MATCH_SELECT as any)
      .eq("tournament_id", tournamentId)
      .order("created_at")
  );
}

export async function fetchMatches(
  supabase: SupabaseClient<Database>,
  tournamentId: string
): Promise<Match[]> {
  const { data } = await matchesQuery(supabase, tournamentId);
  if (!data) return [];
  return (data as unknown as SupabaseMatch[]).map(toMatch);
}
