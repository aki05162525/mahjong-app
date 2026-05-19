import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildRanking } from "@/lib/types";
import type { Match, RankingEntry } from "@/lib/types";

const MATCH_SELECT = `
  id,
  round_number,
  created_at,
  tables(name),
  match_results(
    player_id,
    score,
    rank,
    base_point,
    uma_point,
    total_point,
    players(name)
  )
` as const;

type SupabaseMatch = {
  id: string;
  round_number: number;
  created_at: string;
  tables: { name: string } | null;
  match_results: Array<{
    player_id: string;
    score: number;
    rank: number;
    base_point: number;
    uma_point: number;
    total_point: number;
    players: { name: string } | null;
  }>;
};

function toMatch(row: SupabaseMatch): Match {
  return {
    id: row.id,
    roundNumber: row.round_number,
    tableName: row.tables?.name ?? "",
    createdAt: new Date(row.created_at),
    results: (row.match_results ?? []).map((r) => ({
      playerId: r.player_id,
      playerName: r.players?.name ?? "",
      score: r.score,
      rank: r.rank,
      basePoint: r.base_point,
      umaPoint: r.uma_point,
      totalPoint: r.total_point,
    })),
  };
}

export function useMatches(tournamentId: string): { matches: Match[]; ranking: RankingEntry[] } {
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    const fetchMatches = () =>
      supabase
        .from("matches")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select(MATCH_SELECT as any)
        .eq("tournament_id", tournamentId)
        .order("created_at")
        .then(({ data }) => {
          if (!data) return;
          const mapped = (data as unknown as SupabaseMatch[]).map(toMatch);
          setMatches(mapped);
          setRanking(buildRanking(mapped));
        });

    fetchMatches();

    // Subscribe to matches changes for this tournament
    const matchChannel = supabase
      .channel("matches:" + tournamentId)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` }, fetchMatches)
      .subscribe();

    // Subscribe to match_results INSERT (no tournament_id column; refetch resolves names)
    const resultsChannel = supabase
      .channel("match_results:" + tournamentId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_results" }, fetchMatches)
      .subscribe();

    // Refresh materialized playerName / tableName when a rename happens in this tournament
    const namesChannel = supabase
      .channel("match_names:" + tournamentId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "players", filter: `tournament_id=eq.${tournamentId}` }, fetchMatches)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tables", filter: `tournament_id=eq.${tournamentId}` }, fetchMatches)
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(namesChannel);
    };
  }, [tournamentId]);

  return { matches, ranking };
}
