import type { Match } from "./types";
import type { Database } from "./database.types";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type MatchResultRow = Database["public"]["Tables"]["match_results"]["Row"];

export function applyMatchInsert(
  matches: Match[],
  payload: MatchRow,
  tablesCache: ReadonlyMap<string, string>
): Match[] | null {
  const tableName = tablesCache.get(payload.table_id);
  if (tableName === undefined) return null;

  if (matches.some((m) => m.id === payload.id)) return matches;

  const newMatch: Match = {
    id: payload.id,
    roundNumber: payload.round_number,
    tableName,
    createdAt: new Date(payload.created_at),
    uma: payload.uma,
    returnPoints: payload.return_points,
    results: [],
  };

  return [...matches, newMatch].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function applyResultInsert(
  matches: Match[],
  payload: MatchResultRow,
  playersCache: ReadonlyMap<string, string>
): Match[] | null {
  const playerName = playersCache.get(payload.player_id);
  if (playerName === undefined) return null;

  const matchIndex = matches.findIndex((m) => m.id === payload.match_id);
  if (matchIndex === -1) return null;

  const match = matches[matchIndex];
  if (match.results.some((r) => r.playerId === payload.player_id)) return matches;

  const newResult = {
    playerId: payload.player_id,
    playerName,
    score: payload.score,
    rank: payload.rank,
    basePoint: payload.base_point,
    umaPoint: payload.uma_point,
    okaPoint: payload.oka_point,
    totalPoint: payload.total_point,
  };

  const updatedMatch = { ...match, results: [...match.results, newResult] };
  const updated = [...matches];
  updated[matchIndex] = updatedMatch;
  return updated;
}
