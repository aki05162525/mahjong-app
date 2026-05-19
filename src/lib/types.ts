import type { MatchResult } from "./scoring";

// ========================================
// 型定義
// ========================================

export type Tournament = {
  id: string;
  name: string;
  createdAt: Date;
};

export type Player = {
  id: string;
  name: string;
  createdAt: Date;
};

export type Table = {
  id: string;
  name: string;
  createdAt: Date;
};

export type Match = {
  id: string;
  roundNumber: number;
  tableName: string;
  createdAt: Date;
  results: MatchResult[];
};

export type RankingEntry = {
  playerId: string;
  playerName: string;
  totalPoint: number;
  matchCount: number;
  avgPoint: number;
  avgRank: number;
  avgScore: number;
  maxScore: number;
  topRate: number;
  inTheMoneyRate: number;
  lastAvoidRate: number;
  rank: number;
};

// ========================================
// Match Filter
// ========================================

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

// ========================================
// Ranking
// ========================================

export function buildRanking(matches: Match[]): RankingEntry[] {
  const map = new Map<
    string,
    {
      name: string;
      total: number;
      count: number;
      rankSum: number;
      scoreSum: number;
      maxScore: number;
      topCount: number;
      itmCount: number;
      lastCount: number;
    }
  >();

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
        existing.itmCount += result.rank <= 2 ? 1 : 0;
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
          itmCount: result.rank <= 2 ? 1 : 0,
          lastCount: result.rank === 4 ? 1 : 0,
        });
      }
    }
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const entries = Array.from(map.entries()).map(([playerId, v]) => ({
    playerId,
    playerName: v.name,
    totalPoint: v.total,
    matchCount: v.count,
    avgPoint: v.count > 0 ? round1(v.total / v.count) : 0,
    avgRank: v.count > 0 ? round2(v.rankSum / v.count) : 0,
    avgScore: v.count > 0 ? Math.round(v.scoreSum / v.count) : 0,
    maxScore: v.maxScore,
    topRate: v.count > 0 ? Math.round((v.topCount / v.count) * 100) : 0,
    inTheMoneyRate: v.count > 0 ? Math.round((v.itmCount / v.count) * 100) : 0,
    lastAvoidRate: v.count > 0 ? Math.round(((v.count - v.lastCount) / v.count) * 100) : 0,
    rank: 0,
  }));

  entries.sort((a, b) => b.totalPoint - a.totalPoint);

  // 同点は同順位
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].totalPoint === entries[i - 1].totalPoint) {
      entries[i].rank = entries[i - 1].rank;
    } else {
      entries[i].rank = currentRank;
    }
    currentRank++;
  }

  return entries;
}
