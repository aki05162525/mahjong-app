import { describe, it, expect } from "vitest";
import { calculateBasePoint, calculateUmaPoints, calculateMatchResults } from "./scoring";

// ========================================
// calculateBasePoint
// ========================================
describe("calculateBasePoint", () => {
  it("25000点は 0pt", () => {
    expect(calculateBasePoint(25000)).toBe(0);
  });

  it("42000点は +17pt", () => {
    expect(calculateBasePoint(42000)).toBe(17);
  });

  it("31000点は +6pt", () => {
    expect(calculateBasePoint(31000)).toBe(6);
  });

  it("18000点は -7pt", () => {
    expect(calculateBasePoint(18000)).toBe(-7);
  });

  it("9000点は -16pt", () => {
    expect(calculateBasePoint(9000)).toBe(-16);
  });

  it("36100点は +11.1pt（百点単位の端数が小数第一位に出る）", () => {
    expect(calculateBasePoint(36100)).toBe(11.1);
  });

  it("24900点は -0.1pt", () => {
    expect(calculateBasePoint(24900)).toBe(-0.1);
  });

  it("返し点を指定すると、その返し点を基準に素点を計算する（返し30000・30000点 → 0pt）", () => {
    expect(calculateBasePoint(30000, 30000)).toBe(0);
  });

  it("返し30000・42000点 → +12pt", () => {
    expect(calculateBasePoint(42000, 30000)).toBe(12);
  });
});

// ========================================
// calculateUmaPoints
// ========================================
describe("calculateUmaPoints", () => {
  it("通常ケース: 1位+30, 2位+10, 3位-10, 4位-30", () => {
    const scores = [40000, 30000, 20000, 10000];
    const result = calculateUmaPoints(scores);
    expect(result).toEqual([30, 10, -10, -30]);
  });

  it("同点なし・別の順番でも順位点が正しい", () => {
    const scores = [42000, 31000, 18000, 9000];
    const result = calculateUmaPoints(scores);
    expect(result).toEqual([30, 10, -10, -30]);
  });

  // 要件例1: 2着同点
  it("2着同点: 2位と3位の順位点を平均する (+10 + -10) / 2 = 0", () => {
    const scores = [40000, 25000, 25000, 10000];
    const result = calculateUmaPoints(scores);
    expect(result[0]).toBe(30); // 1位
    expect(result[1]).toBe(0); // 2位同点
    expect(result[2]).toBe(0); // 2位同点
    expect(result[3]).toBe(-30); // 4位
  });

  // 要件例2: 1着同点
  it("1着同点: 1位と2位の順位点を平均する (+30 + +10) / 2 = +20", () => {
    const scores = [35000, 35000, 20000, 10000];
    const result = calculateUmaPoints(scores);
    expect(result[0]).toBe(20); // 1位同点
    expect(result[1]).toBe(20); // 1位同点
    expect(result[2]).toBe(-10); // 3位
    expect(result[3]).toBe(-30); // 4位
  });

  it("3人同点: 2位・3位・4位が同点の場合 (+10 + -10 + -30) / 3 = -10", () => {
    const scores = [40000, 20000, 20000, 20000];
    const result = calculateUmaPoints(scores);
    expect(result[0]).toBe(30);
    expect(result[1]).toBeCloseTo(-10);
    expect(result[2]).toBeCloseTo(-10);
    expect(result[3]).toBeCloseTo(-10);
  });

  it("全員同点: 全順位点の平均 (30+10-10-30)/4 = 0", () => {
    const scores = [25000, 25000, 25000, 25000];
    const result = calculateUmaPoints(scores);
    expect(result).toEqual([0, 0, 0, 0]);
  });

  it("ウマ配列を指定すると、その順位点を使う（ワンツー 10-20）", () => {
    const scores = [40000, 30000, 20000, 10000];
    const result = calculateUmaPoints(scores, [20, 10, -10, -20]);
    expect(result).toEqual([20, 10, -10, -20]);
  });

  it("指定ウマでも同点按分する（ワンツーで1着同点 → (20+10)/2 = 15）", () => {
    const scores = [35000, 35000, 20000, 10000];
    const result = calculateUmaPoints(scores, [20, 10, -10, -20]);
    expect(result[0]).toBe(15);
    expect(result[1]).toBe(15);
    expect(result[2]).toBe(-10);
    expect(result[3]).toBe(-20);
  });
});

// ========================================
// calculateMatchResults
// ========================================
describe("calculateMatchResults", () => {
  it("通常ケース: 各プレイヤーの合計ptを正しく計算する", () => {
    const inputs = [
      { playerId: "p1", playerName: "Alice", score: 42000 },
      { playerId: "p2", playerName: "Bob", score: 31000 },
      { playerId: "p3", playerName: "Carol", score: 18000 },
      { playerId: "p4", playerName: "Dave", score: 9000 },
    ];
    const results = calculateMatchResults(inputs);

    // 1位: Alice 42000点 → 素点+17, 順位点+30, 合計+47
    expect(results[0].playerId).toBe("p1");
    expect(results[0].rank).toBe(1);
    expect(results[0].basePoint).toBe(17);
    expect(results[0].umaPoint).toBe(30);
    expect(results[0].totalPoint).toBe(47);

    // 2位: Bob 31000点 → 素点+6, 順位点+10, 合計+16
    expect(results[1].playerId).toBe("p2");
    expect(results[1].rank).toBe(2);
    expect(results[1].basePoint).toBe(6);
    expect(results[1].umaPoint).toBe(10);
    expect(results[1].totalPoint).toBe(16);

    // 3位: Carol 18000点 → 素点-7, 順位点-10, 合計-17
    expect(results[2].playerId).toBe("p3");
    expect(results[2].rank).toBe(3);
    expect(results[2].basePoint).toBe(-7);
    expect(results[2].umaPoint).toBe(-10);
    expect(results[2].totalPoint).toBe(-17);

    // 4位: Dave 9000点 → 素点-16, 順位点-30, 合計-46
    expect(results[3].playerId).toBe("p4");
    expect(results[3].rank).toBe(4);
    expect(results[3].basePoint).toBe(-16);
    expect(results[3].umaPoint).toBe(-30);
    expect(results[3].totalPoint).toBe(-46);
  });

  it("2着同点: 同点の2人の順位は同じで、順位点は按分される", () => {
    const inputs = [
      { playerId: "p1", playerName: "Alice", score: 40000 },
      { playerId: "p2", playerName: "Bob", score: 25000 },
      { playerId: "p3", playerName: "Carol", score: 25000 },
      { playerId: "p4", playerName: "Dave", score: 10000 },
    ];
    const results = calculateMatchResults(inputs);

    const alice = results.find((r) => r.playerId === "p1")!;
    const bob = results.find((r) => r.playerId === "p2")!;
    const carol = results.find((r) => r.playerId === "p3")!;
    const dave = results.find((r) => r.playerId === "p4")!;

    expect(alice.rank).toBe(1);
    expect(bob.rank).toBe(2);
    expect(carol.rank).toBe(2);
    expect(dave.rank).toBe(4);

    expect(bob.umaPoint).toBe(0);
    expect(carol.umaPoint).toBe(0);
  });

  it("返し点>25000のとき、トップにオカが付き、卓全体でゼロサムになる（返し30000 → オカ+20）", () => {
    const inputs = [
      { playerId: "p1", playerName: "Alice", score: 42000 },
      { playerId: "p2", playerName: "Bob", score: 31000 },
      { playerId: "p3", playerName: "Carol", score: 18000 },
      { playerId: "p4", playerName: "Dave", score: 9000 },
    ];
    const results = calculateMatchResults(inputs, {
      uma: [30, 10, -10, -30],
      returnPoints: 30000,
    });

    // 1位 Alice: 素点(42000-30000)/1000=+12, ウマ+30, オカ+20, 合計+62
    expect(results[0].basePoint).toBe(12);
    expect(results[0].umaPoint).toBe(30);
    expect(results[0].okaPoint).toBe(20);
    expect(results[0].totalPoint).toBe(62);

    // 2位以下にオカは付かない
    expect(results[1].okaPoint).toBe(0);
    expect(results[1].totalPoint).toBe(11); // +1 +10 +0
    expect(results[2].okaPoint).toBe(0);
    expect(results[3].okaPoint).toBe(0);

    // 卓全体ゼロサム
    const sum = results.reduce((s, r) => s + r.totalPoint, 0);
    expect(sum).toBe(0);
  });

  it("トップ同点のときオカを頭割りする（返し30000・1着同点 → オカ各+10）", () => {
    const inputs = [
      { playerId: "p1", playerName: "Alice", score: 35000 },
      { playerId: "p2", playerName: "Bob", score: 35000 },
      { playerId: "p3", playerName: "Carol", score: 20000 },
      { playerId: "p4", playerName: "Dave", score: 10000 },
    ];
    const results = calculateMatchResults(inputs, {
      uma: [30, 10, -10, -30],
      returnPoints: 30000,
    });

    expect(results[0].okaPoint).toBe(10);
    expect(results[1].okaPoint).toBe(10);
    expect(results[2].okaPoint).toBe(0);
    expect(results[3].okaPoint).toBe(0);

    const sum = results.reduce((s, r) => s + r.totalPoint, 0);
    expect(sum).toBe(0);
  });

  it("返し25000（オカなし）のときオカは0", () => {
    const inputs = [
      { playerId: "p1", playerName: "Alice", score: 42000 },
      { playerId: "p2", playerName: "Bob", score: 31000 },
      { playerId: "p3", playerName: "Carol", score: 18000 },
      { playerId: "p4", playerName: "Dave", score: 9000 },
    ];
    const results = calculateMatchResults(inputs, {
      uma: [30, 10, -10, -30],
      returnPoints: 25000,
    });
    expect(results.every((r) => r.okaPoint === 0)).toBe(true);
  });

  it("入力順が点数と無関係でも正しく順位を付ける", () => {
    const inputs = [
      { playerId: "p3", playerName: "Carol", score: 18000 },
      { playerId: "p1", playerName: "Alice", score: 42000 },
      { playerId: "p4", playerName: "Dave", score: 9000 },
      { playerId: "p2", playerName: "Bob", score: 31000 },
    ];
    const results = calculateMatchResults(inputs);

    expect(results.find((r) => r.playerId === "p1")!.rank).toBe(1);
    expect(results.find((r) => r.playerId === "p2")!.rank).toBe(2);
    expect(results.find((r) => r.playerId === "p3")!.rank).toBe(3);
    expect(results.find((r) => r.playerId === "p4")!.rank).toBe(4);
  });
});
