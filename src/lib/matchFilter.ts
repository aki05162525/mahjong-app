import type { Match } from "./types";

// 卓を省略した単一卓モードでは、過去に卓IDを持っていた対局も含めて提案する。
// null は卓なしの対局だけ、ID指定はその卓だけを対象にする。
export function getSuggestedRound(matches: Match[], tableId?: string | null): number {
  return (
    matches.reduce(
      (max, match) =>
        tableId === undefined || match.tableId === tableId ? Math.max(max, match.roundNumber) : max,
      0
    ) + 1
  );
}

export function getUsedPlayerIds(matches: Match[], roundNumber: number): Set<string> {
  const ids = new Set<string>();
  for (const match of matches) {
    if (match.roundNumber === roundNumber) {
      for (const result of match.results) {
        ids.add(result.playerId);
      }
    }
  }
  return ids;
}
