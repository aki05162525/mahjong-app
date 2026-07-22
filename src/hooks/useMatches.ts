import { useEffect, useRef, useState } from "react";
import { supabase } from "@/infra/supabase";
import { buildRanking } from "@/lib/ranking";
import { debounce } from "@/lib/debounce";
import { applyMatchInsert, applyResultInsert } from "@/lib/matchUpdater";
import { matchesQuery, toMatch, type SupabaseMatch } from "@/lib/matchesQuery";
import type { Match, RankingEntry } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type MatchResultRow = Database["public"]["Tables"]["match_results"]["Row"];

export function useMatches(tournamentId: string): { matches: Match[]; ranking: RankingEntry[] } {
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const matchesRef = useRef<Match[]>([]);
  const playersCacheRef = useRef<Map<string, string>>(new Map());
  const tablesCacheRef = useRef<Map<string, string>>(new Map());

  const updateState = (newMatches: Match[]) => {
    matchesRef.current = newMatches;
    setMatches(newMatches);
    setRanking(buildRanking(newMatches));
  };

  useEffect(() => {
    const fetchMatches = () =>
      matchesQuery(supabase, tournamentId).then(({ data }) => {
        if (!data) return;
        const mapped = (data as unknown as SupabaseMatch[]).map(toMatch);
        updateState(mapped);
      });

    const debouncedFetch = debounce(fetchMatches, 100);

    const fetchPlayersCache = () =>
      supabase
        .from("players")
        .select("id, name")
        .eq("tournament_id", tournamentId)
        .then(({ data }) => {
          if (data) {
            playersCacheRef.current = new Map(data.map((p) => [p.id, p.name]));
          }
        });

    const fetchTablesCache = () =>
      supabase
        .from("tables")
        .select("id, name")
        .eq("tournament_id", tournamentId)
        .then(({ data }) => {
          if (data) {
            tablesCacheRef.current = new Map(data.map((t) => [t.id, t.name]));
          }
        });

    fetchMatches();
    fetchPlayersCache();
    fetchTablesCache();

    const handleMatchInsert = (payload: { new: MatchRow }) => {
      const next = applyMatchInsert(matchesRef.current, payload.new, tablesCacheRef.current);
      if (next === null) {
        debouncedFetch();
        return;
      }
      updateState(next);
    };

    // DELETE の old record には REPLICA IDENTITY（デフォルト = 主キー）の列しか入らないため、
    // tournament_id によるサーバー側フィルタは評価されずイベントが届かない。
    // フィルタなしで購読し、自分の一覧にある id の削除だけ拾って再取得する。
    // ローカル削除でなく再取得なのは、削除 RPC が後続対局の round_number を再採番するため。
    const handleMatchDelete = (payload: { old: Partial<MatchRow> }) => {
      const deletedId = payload.old.id;
      if (deletedId && matchesRef.current.some((m) => m.id === deletedId)) {
        debouncedFetch();
      }
    };

    const handleResultInsert = (payload: { new: MatchResultRow }) => {
      const next = applyResultInsert(matchesRef.current, payload.new, playersCacheRef.current);
      if (next === null) {
        debouncedFetch();
        return;
      }
      updateState(next);
    };

    const matchChannel = supabase
      .channel("matches:" + tournamentId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        handleMatchInsert
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "matches",
        },
        handleMatchDelete
      )
      .subscribe();

    // DELETE は購読しない。match_results は matches 削除時の CASCADE でのみ消えるため、
    // matches の DELETE 購読による全件再取得で既にカバーされている。
    const resultsChannel = supabase
      .channel("match_results:" + tournamentId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_results",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        handleResultInsert
      )
      .subscribe();

    // プレイヤー・卓の名前変更時はキャッシュ更新と全件再取得
    const namesChannel = supabase
      .channel("match_names:" + tournamentId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchPlayersCache();
          debouncedFetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchTablesCache();
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      debouncedFetch.cancel();
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(namesChannel);
    };
  }, [tournamentId]);

  return { matches, ranking };
}
