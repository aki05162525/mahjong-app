import { useEffect, useState } from "react";
import { subscribeMatches, buildRanking, type Match, type RankingEntry } from "@/lib/firestore";

export function useMatches(tournamentId: string): { matches: Match[]; ranking: RankingEntry[] } {
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    return subscribeMatches(tournamentId, (m) => {
      setMatches(m);
      setRanking(buildRanking(m));
    });
  }, [tournamentId]);

  return { matches, ranking };
}
