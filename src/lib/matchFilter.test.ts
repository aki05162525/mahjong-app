import { describe, it, expect } from "vitest";
import { getUsedPlayerIds } from "./types";
import type { Match } from "./types";

const makeMatch = (id: string, roundNumber: number, playerIds: string[]): Match => ({
  id,
  roundNumber,
  tableName: "A卓",
  createdAt: new Date(),
  results: playerIds.map((playerId, i) => ({
    playerId,
    playerName: `Player${i + 1}`,
    score: 25000,
    rank: i + 1,
    basePoint: 0,
    umaPoint: 0,
    totalPoint: 0,
  })),
});

describe("getUsedPlayerIds", () => {
  it("指定した回戦に出場済みのプレイヤーIDをSetで返す", () => {
    const matches = [makeMatch("m1", 1, ["p1", "p2", "p3", "p4"])];
    const result = getUsedPlayerIds(matches, 1);
    expect(result.has("p1")).toBe(true);
    expect(result.has("p4")).toBe(true);
    expect(result.size).toBe(4);
  });

  it("複数卓ある場合は全卓のプレイヤーを含む", () => {
    const matches = [
      makeMatch("m1", 1, ["p1", "p2", "p3", "p4"]),
      makeMatch("m2", 1, ["p5", "p6", "p7", "p8"]),
    ];
    const result = getUsedPlayerIds(matches, 1);
    expect(result.size).toBe(8);
    expect(result.has("p5")).toBe(true);
  });

  it("対象の回戦がない場合は空のSetを返す", () => {
    const matches = [makeMatch("m1", 1, ["p1", "p2", "p3", "p4"])];
    const result = getUsedPlayerIds(matches, 2);
    expect(result.size).toBe(0);
  });

  it("異なる回戦のプレイヤーは含まない", () => {
    const matches = [
      makeMatch("m1", 1, ["p1", "p2", "p3", "p4"]),
      makeMatch("m2", 2, ["p1", "p5", "p6", "p7"]),
    ];
    const result = getUsedPlayerIds(matches, 2);
    expect(result.size).toBe(4);
    expect(result.has("p1")).toBe(true);
    expect(result.has("p2")).toBe(false);
  });
});
