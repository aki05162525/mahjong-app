import type { MatchResult } from "./scoring";

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
  avgRank: number;     // 平均着順
  avgScore: number;    // 平均打点（持ち点の平均）
  maxScore: number;    // 最高スコア
  topRate: number;     // トップ率（%）
  top2Rate: number;    // 連対率（%）
  lastAvoidRate: number; // ラス回避率（%）
  rank: number;
};
