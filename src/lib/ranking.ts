import { Match, RankingEntry } from "./types";

type PlayerStats = {
  name: string;
  total: number;
  count: number;
  rankSum: number;
  scoreSum: number;
  maxScore: number;
  topCount: number;
  top2Count: number;
  lastCount: number;
};

const roundTo2 = (n: number) => Math.round(n * 100) / 100;

export function buildRanking(matches: Match[]): RankingEntry[] {
  const map = new Map<string, PlayerStats>();

  for (const match of matches) {
    for (const result of match.results) {
      const existing = map.get(result.playerId);
      if (existing) {
        existing.total += result.totalPoint;
        existing.count += 1;
        existing.rankSum += result.rank;
        existing.scoreSum += result.score;
        existing.maxScore = Math.max(existing.maxScore, result.score);
        existing.topCount += result.rank === 1 ? 1 : 0;
        existing.top2Count += result.rank <= 2 ? 1 : 0;
        existing.lastCount += result.rank === 4 ? 1 : 0;
      } else {
        map.set(result.playerId, {
          name: result.playerName,
          total: result.totalPoint,
          count: 1,
          rankSum: result.rank,
          scoreSum: result.score,
          maxScore: result.score,
          topCount: result.rank === 1 ? 1 : 0,
          top2Count: result.rank <= 2 ? 1 : 0,
          lastCount: result.rank === 4 ? 1 : 0,
        });
      }
    }
  }

  const entries = Array.from(map.entries()).map(([playerId, v]) => ({
    playerId,
    playerName: v.name,
    totalPoint: v.total,
    matchCount: v.count,
    avgRank: v.count > 0 ? roundTo2(v.rankSum / v.count) : 0,
    avgScore: v.count > 0 ? Math.round(v.scoreSum / v.count) : 0,
    maxScore: v.maxScore,
    topRate: v.count > 0 ? Math.round((v.topCount / v.count) * 100) : 0,
    top2Rate: v.count > 0 ? Math.round((v.top2Count / v.count) * 100) : 0,
    lastAvoidRate: v.count > 0 ? Math.round(((v.count - v.lastCount) / v.count) * 100) : 0,
    rank: 0,
  }));

  entries.sort((a, b) => b.totalPoint - a.totalPoint);

  // 同点は同順位
  for (let i = 0; i < entries.length; i++) {
    entries[i].rank =
      i > 0 && entries[i].totalPoint === entries[i - 1].totalPoint ? entries[i - 1].rank : i + 1;
  }

  return entries;
}
