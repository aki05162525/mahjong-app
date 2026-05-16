import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { calculateMatchResults, type MatchInput, type MatchResult } from "./scoring";

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
  topRate: number;
  inTheMoneyRate: number;
  lastAvoidRate: number;
  rank: number;
};

// ========================================
// Tournament
// ========================================

export async function createTournament(name: string, customId?: string): Promise<string> {
  if (customId) {
    const ref = doc(db, "tournaments", customId);
    const existing = await getDoc(ref);
    if (existing.exists()) throw new Error("ID_TAKEN");
    await setDoc(ref, { name, createdAt: serverTimestamp() });
    return customId;
  }
  const ref = await addDoc(collection(db, "tournaments"), {
    name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const snap = await getDoc(doc(db, "tournaments", tournamentId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

// ========================================
// Players
// ========================================

export async function addPlayer(tournamentId: string, name: string): Promise<string> {
  const ref = await addDoc(
    collection(db, "tournaments", tournamentId, "players"),
    { name, createdAt: serverTimestamp() }
  );
  return ref.id;
}

export async function getPlayers(tournamentId: string): Promise<Player[]> {
  const snap = await getDocs(
    query(collection(db, "tournaments", tournamentId, "players"), orderBy("createdAt"))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      createdAt: (data.createdAt as Timestamp).toDate(),
    };
  });
}

export function subscribePlayers(
  tournamentId: string,
  callback: (players: Player[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "tournaments", tournamentId, "players"), orderBy("createdAt")),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
          };
        })
      );
    }
  );
}

// ========================================
// Tables
// ========================================

export async function addTable(tournamentId: string, name: string): Promise<string> {
  const ref = await addDoc(
    collection(db, "tournaments", tournamentId, "tables"),
    { name, createdAt: serverTimestamp() }
  );
  return ref.id;
}

export function subscribeTables(
  tournamentId: string,
  callback: (tables: Table[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "tournaments", tournamentId, "tables"), orderBy("createdAt")),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
          };
        })
      );
    }
  );
}

// ========================================
// Matches
// ========================================

export async function saveMatch(
  tournamentId: string,
  roundNumber: number,
  tableName: string,
  inputs: MatchInput[]
): Promise<string> {
  const results = calculateMatchResults(inputs);
  const ref = await addDoc(
    collection(db, "tournaments", tournamentId, "matches"),
    {
      roundNumber,
      tableName,
      results,
      createdAt: serverTimestamp(),
    }
  );
  return ref.id;
}

export async function deleteMatch(tournamentId: string, matchId: string): Promise<void> {
  await deleteDoc(doc(db, "tournaments", tournamentId, "matches", matchId));
}

export function subscribeMatches(
  tournamentId: string,
  callback: (matches: Match[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "tournaments", tournamentId, "matches"), orderBy("createdAt")),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            roundNumber: data.roundNumber,
            tableName: data.tableName,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
            results: data.results as MatchResult[],
          };
        })
      );
    }
  );
}

// ========================================
// Ranking
// ========================================

export function buildRanking(matches: Match[]): RankingEntry[] {
  const map = new Map<string, {
    name: string;
    total: number;
    count: number;
    rankSum: number;
    scoreSum: number;
    topCount: number;
    itmCount: number;
    lastCount: number;
  }>();

  for (const match of matches) {
    for (const result of match.results) {
      const existing = map.get(result.playerId);
      if (existing) {
        existing.total     += result.totalPoint;
        existing.count     += 1;
        existing.rankSum   += result.rank;
        existing.scoreSum  += result.score;
        existing.topCount  += result.rank === 1 ? 1 : 0;
        existing.itmCount  += result.rank <= 2 ? 1 : 0;
        existing.lastCount += result.rank === 4 ? 1 : 0;
      } else {
        map.set(result.playerId, {
          name:      result.playerName,
          total:     result.totalPoint,
          count:     1,
          rankSum:   result.rank,
          scoreSum:  result.score,
          topCount:  result.rank === 1 ? 1 : 0,
          itmCount:  result.rank <= 2 ? 1 : 0,
          lastCount: result.rank === 4 ? 1 : 0,
        });
      }
    }
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const entries = Array.from(map.entries()).map(([playerId, v]) => ({
    playerId,
    playerName:     v.name,
    totalPoint:     v.total,
    matchCount:     v.count,
    avgPoint:       v.count > 0 ? round1(v.total / v.count) : 0,
    avgRank:        v.count > 0 ? round2(v.rankSum / v.count) : 0,
    avgScore:       v.count > 0 ? Math.round(v.scoreSum / v.count) : 0,
    topRate:        v.count > 0 ? Math.round((v.topCount / v.count) * 100) : 0,
    inTheMoneyRate: v.count > 0 ? Math.round((v.itmCount / v.count) * 100) : 0,
    lastAvoidRate:  v.count > 0 ? Math.round(((v.count - v.lastCount) / v.count) * 100) : 0,
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
