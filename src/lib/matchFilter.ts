import type { Match } from "./types";

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
