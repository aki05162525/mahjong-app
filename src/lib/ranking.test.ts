import { describe, it, expect } from "vitest";
import { buildRanking, type Match } from "./types";

const makeMatch = (id: string, results: Match["results"]): Match => ({
  id,
  roundNumber: 1,
  tableName: "A卓",
  createdAt: new Date(),
  results,
});

describe("buildRanking", () => {
  it("合計ptと平均打点は別物: 合計ptはウマ込みのpt、平均打点は実際の持ち点", () => {
    // 42000点 → basePoint +17, umaPoint +30, totalPoint +47
    // 合計pt = 47（ptの合計）、平均打点 = 42000（実際の持ち点）
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
    ];
    const ranking = buildRanking(matches);
    const alice = ranking.find(r => r.playerId === "p1")!;

    expect(alice.totalPoint).toBe(47);      // ptの合計（42000点そのものではない）
    expect(alice.avgScore).toBe(42000);     // 実際の持ち点（ptではない）
    expect(alice.totalPoint).not.toBe(alice.avgScore); // 絶対に一致しない
  });

  it("1試合のランキングを正しく集計する", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
    ];

    const ranking = buildRanking(matches);

    expect(ranking[0].playerId).toBe("p1");
    expect(ranking[0].totalPoint).toBe(47);
    expect(ranking[0].matchCount).toBe(1);
    expect(ranking[0].rank).toBe(1);

    expect(ranking[3].playerId).toBe("p4");
    expect(ranking[3].rank).toBe(4);
  });

  it("複数試合の合計ptを正しく集計する", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
      makeMatch("m2", [
        { playerId: "p2", playerName: "Bob",   score: 40000, rank: 1, basePoint: 15, umaPoint: 30, totalPoint: 45 },
        { playerId: "p1", playerName: "Alice", score: 30000, rank: 2, basePoint: 5,  umaPoint: 10, totalPoint: 15 },
        { playerId: "p4", playerName: "Dave",  score: 20000, rank: 3, basePoint: -5, umaPoint: -10, totalPoint: -15 },
        { playerId: "p3", playerName: "Carol", score: 10000, rank: 4, basePoint: -15, umaPoint: -30, totalPoint: -45 },
      ]),
    ];

    const ranking = buildRanking(matches);

    const alice = ranking.find(r => r.playerId === "p1")!;
    const bob   = ranking.find(r => r.playerId === "p2")!;

    expect(alice.totalPoint).toBe(47 + 15);  // 62
    expect(alice.matchCount).toBe(2);
    expect(alice.avgPoint).toBe(31);

    expect(bob.totalPoint).toBe(16 + 45);    // 61
    expect(bob.matchCount).toBe(2);
  });

  it("同点は同順位になる", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 35000, rank: 1, basePoint: 10, umaPoint: 20, totalPoint: 30 },
        { playerId: "p2", playerName: "Bob",   score: 35000, rank: 1, basePoint: 10, umaPoint: 20, totalPoint: 30 },
        { playerId: "p3", playerName: "Carol", score: 20000, rank: 3, basePoint: -5, umaPoint: -10, totalPoint: -15 },
        { playerId: "p4", playerName: "Dave",  score: 10000, rank: 4, basePoint: -15, umaPoint: -30, totalPoint: -45 },
      ]),
    ];

    const ranking = buildRanking(matches);
    const alice = ranking.find(r => r.playerId === "p1")!;
    const bob   = ranking.find(r => r.playerId === "p2")!;

    expect(alice.rank).toBe(bob.rank);
    expect(alice.rank).toBe(1);
  });

  it("試合がない場合は空配列を返す", () => {
    expect(buildRanking([])).toEqual([]);
  });

  // ========================================
  // 追加統計のテスト
  // ========================================

  it("平均順位を正しく計算する", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
      makeMatch("m2", [
        { playerId: "p1", playerName: "Alice", score: 10000, rank: 4, basePoint: -15, umaPoint: -30, totalPoint: -45 },
        { playerId: "p2", playerName: "Bob",   score: 30000, rank: 2, basePoint: 5,  umaPoint: 10, totalPoint: 15 },
        { playerId: "p3", playerName: "Carol", score: 40000, rank: 1, basePoint: 15, umaPoint: 30, totalPoint: 45 },
        { playerId: "p4", playerName: "Dave",  score: 20000, rank: 3, basePoint: -5, umaPoint: -10, totalPoint: -15 },
      ]),
    ];

    const ranking = buildRanking(matches);
    const alice = ranking.find(r => r.playerId === "p1")!;
    const bob   = ranking.find(r => r.playerId === "p2")!;

    // Alice: 1位 + 4位 → 平均 2.5
    expect(alice.avgRank).toBe(2.5);
    // Bob: 2位 + 2位 → 平均 2.0
    expect(bob.avgRank).toBe(2.0);
  });

  it("平均打点を正しく計算する（千点単位）", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
      makeMatch("m2", [
        { playerId: "p1", playerName: "Alice", score: 30000, rank: 2, basePoint: 5,  umaPoint: 10, totalPoint: 15 },
        { playerId: "p2", playerName: "Bob",   score: 40000, rank: 1, basePoint: 15, umaPoint: 30, totalPoint: 45 },
        { playerId: "p3", playerName: "Carol", score: 20000, rank: 3, basePoint: -5, umaPoint: -10, totalPoint: -15 },
        { playerId: "p4", playerName: "Dave",  score: 10000, rank: 4, basePoint: -15, umaPoint: -30, totalPoint: -45 },
      ]),
    ];

    const ranking = buildRanking(matches);
    const alice = ranking.find(r => r.playerId === "p1")!;

    // Alice: (42000 + 30000) / 2 = 36000
    expect(alice.avgScore).toBe(36000);
  });

  it("トップ率を正しく計算する", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
      makeMatch("m2", [
        { playerId: "p1", playerName: "Alice", score: 10000, rank: 4, basePoint: -15, umaPoint: -30, totalPoint: -45 },
        { playerId: "p2", playerName: "Bob",   score: 40000, rank: 1, basePoint: 15, umaPoint: 30, totalPoint: 45 },
        { playerId: "p3", playerName: "Carol", score: 30000, rank: 2, basePoint: 5,  umaPoint: 10, totalPoint: 15 },
        { playerId: "p4", playerName: "Dave",  score: 20000, rank: 3, basePoint: -5, umaPoint: -10, totalPoint: -15 },
      ]),
    ];

    const ranking = buildRanking(matches);
    const alice = ranking.find(r => r.playerId === "p1")!;
    const bob   = ranking.find(r => r.playerId === "p2")!;

    // Alice: 1位が1回/2試合 = 50%
    expect(alice.topRate).toBe(50);
    // Bob: 1位が1回/2試合 = 50%
    expect(bob.topRate).toBe(50);
  });

  it("ラス回避率を正しく計算する", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
      makeMatch("m2", [
        { playerId: "p1", playerName: "Alice", score: 10000, rank: 4, basePoint: -15, umaPoint: -30, totalPoint: -45 },
        { playerId: "p2", playerName: "Bob",   score: 40000, rank: 1, basePoint: 15, umaPoint: 30, totalPoint: 45 },
        { playerId: "p3", playerName: "Carol", score: 30000, rank: 2, basePoint: 5,  umaPoint: 10, totalPoint: 15 },
        { playerId: "p4", playerName: "Dave",  score: 20000, rank: 3, basePoint: -5, umaPoint: -10, totalPoint: -15 },
      ]),
    ];

    const ranking = buildRanking(matches);
    const alice = ranking.find(r => r.playerId === "p1")!;
    const bob   = ranking.find(r => r.playerId === "p2")!;
    const dave  = ranking.find(r => r.playerId === "p4")!;

    // Alice: 4位が1回/2試合 → 回避率50%
    expect(alice.lastAvoidRate).toBe(50);
    // Bob: 4位が0回/2試合 → 回避率100%
    expect(bob.lastAvoidRate).toBe(100);
    // Dave: 4位が1回/2試合 → 回避率50%
    expect(dave.lastAvoidRate).toBe(50);
  });

  it("連対率を正しく計算する（1位+2位の割合）", () => {
    const matches: Match[] = [
      makeMatch("m1", [
        { playerId: "p1", playerName: "Alice", score: 42000, rank: 1, basePoint: 17, umaPoint: 30, totalPoint: 47 },
        { playerId: "p2", playerName: "Bob",   score: 31000, rank: 2, basePoint: 6,  umaPoint: 10, totalPoint: 16 },
        { playerId: "p3", playerName: "Carol", score: 18000, rank: 3, basePoint: -7, umaPoint: -10, totalPoint: -17 },
        { playerId: "p4", playerName: "Dave",  score: 9000,  rank: 4, basePoint: -16, umaPoint: -30, totalPoint: -46 },
      ]),
      makeMatch("m2", [
        { playerId: "p1", playerName: "Alice", score: 10000, rank: 4, basePoint: -15, umaPoint: -30, totalPoint: -45 },
        { playerId: "p2", playerName: "Bob",   score: 40000, rank: 1, basePoint: 15, umaPoint: 30, totalPoint: 45 },
        { playerId: "p3", playerName: "Carol", score: 30000, rank: 2, basePoint: 5,  umaPoint: 10, totalPoint: 15 },
        { playerId: "p4", playerName: "Dave",  score: 20000, rank: 3, basePoint: -5, umaPoint: -10, totalPoint: -15 },
      ]),
    ];

    const ranking = buildRanking(matches);
    const alice = ranking.find(r => r.playerId === "p1")!;
    const bob   = ranking.find(r => r.playerId === "p2")!;
    const carol = ranking.find(r => r.playerId === "p3")!;

    // Alice: 1位1回+2位0回 = 1/2 = 50%
    expect(alice.inTheMoneyRate).toBe(50);
    // Bob: 1位1回+2位1回 = 2/2 = 100%
    expect(bob.inTheMoneyRate).toBe(100);
    // Carol: 1位0回+2位1回 = 1/2 = 50%
    expect(carol.inTheMoneyRate).toBe(50);
  });
});
