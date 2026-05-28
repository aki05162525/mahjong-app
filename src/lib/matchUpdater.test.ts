import { describe, it, expect } from "vitest";
import { applyMatchInsert, applyResultInsert } from "./matchUpdater";
import type { Match } from "./types";

const baseMatch: Match = {
  id: "match-1",
  roundNumber: 1,
  tableName: "East Table",
  createdAt: new Date("2024-01-01T10:00:00Z"),
  results: [],
};

const matchWithResults: Match = {
  ...baseMatch,
  results: [
    {
      playerId: "player-1",
      playerName: "Alice",
      score: 30000,
      rank: 1,
      basePoint: 5,
      umaPoint: 30,
      totalPoint: 35,
    },
  ],
};

describe("applyMatchInsert", () => {
  it("テーブルキャッシュにtable_idが存在するとき、新しいマッチをstateに追加する", () => {
    const tablesCache = new Map([["table-2", "West Table"]]);
    const payload = {
      id: "match-2",
      tournament_id: "t-1",
      table_id: "table-2",
      round_number: 2,
      created_at: "2024-01-01T11:00:00Z",
    };

    const result = applyMatchInsert([baseMatch], payload, tablesCache);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![1]).toMatchObject({
      id: "match-2",
      roundNumber: 2,
      tableName: "West Table",
    });
  });

  it("追加後のマッチはcreated_at順に並ぶ", () => {
    const tablesCache = new Map([["table-2", "West Table"]]);
    const earlyMatch: Match = {
      ...baseMatch,
      id: "match-0",
      createdAt: new Date("2024-01-01T09:00:00Z"),
    };
    const payload = {
      id: "match-2",
      tournament_id: "t-1",
      table_id: "table-2",
      round_number: 2,
      created_at: "2024-01-01T11:00:00Z",
    };

    const result = applyMatchInsert([baseMatch, earlyMatch], payload, tablesCache);

    expect(result).not.toBeNull();
    expect(result!.map((m) => m.id)).toEqual(["match-0", "match-1", "match-2"]);
  });

  it("テーブルキャッシュにtable_idが存在しないとき、nullを返す（フォールバック）", () => {
    const tablesCache = new Map<string, string>();
    const payload = {
      id: "match-2",
      tournament_id: "t-1",
      table_id: "unknown-table",
      round_number: 2,
      created_at: "2024-01-01T11:00:00Z",
    };

    const result = applyMatchInsert([baseMatch], payload, tablesCache);

    expect(result).toBeNull();
  });

  it("すでに同じidのマッチが存在するとき、stateをそのまま返す（冪等性）", () => {
    const tablesCache = new Map([["table-1", "East Table"]]);
    const payload = {
      id: "match-1",
      tournament_id: "t-1",
      table_id: "table-1",
      round_number: 1,
      created_at: "2024-01-01T10:00:00Z",
    };

    const result = applyMatchInsert([baseMatch], payload, tablesCache);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toBe(baseMatch);
  });
});

describe("applyResultInsert", () => {
  it("プレイヤーキャッシュにplayer_idが存在し、マッチも存在するとき、resultsに結果を追加する", () => {
    const playersCache = new Map([["player-2", "Bob"]]);
    const payload = {
      id: "result-2",
      match_id: "match-1",
      tournament_id: "t-1",
      player_id: "player-2",
      score: 25000,
      rank: 2,
      base_point: 0,
      uma_point: 10,
      total_point: 10,
    };

    const result = applyResultInsert([matchWithResults], payload, playersCache);

    expect(result).not.toBeNull();
    expect(result![0].results).toHaveLength(2);
    expect(result![0].results[1]).toMatchObject({
      playerId: "player-2",
      playerName: "Bob",
      score: 25000,
      rank: 2,
    });
  });

  it("プレイヤーキャッシュにplayer_idが存在しないとき、nullを返す（フォールバック）", () => {
    const playersCache = new Map<string, string>();
    const payload = {
      id: "result-x",
      match_id: "match-1",
      tournament_id: "t-1",
      player_id: "unknown-player",
      score: 25000,
      rank: 2,
      base_point: 0,
      uma_point: 10,
      total_point: 10,
    };

    const result = applyResultInsert([baseMatch], payload, playersCache);

    expect(result).toBeNull();
  });

  it("match_idに対応するマッチがstateに存在しないとき、nullを返す（フォールバック）", () => {
    const playersCache = new Map([["player-1", "Alice"]]);
    const payload = {
      id: "result-x",
      match_id: "nonexistent-match",
      tournament_id: "t-1",
      player_id: "player-1",
      score: 25000,
      rank: 2,
      base_point: 0,
      uma_point: 10,
      total_point: 10,
    };

    const result = applyResultInsert([baseMatch], payload, playersCache);

    expect(result).toBeNull();
  });

  it("すでに同じplayer_idのresultが存在するとき、stateをそのまま返す（冪等性）", () => {
    const playersCache = new Map([["player-1", "Alice"]]);
    const payload = {
      id: "result-dup",
      match_id: "match-1",
      tournament_id: "t-1",
      player_id: "player-1",
      score: 30000,
      rank: 1,
      base_point: 5,
      uma_point: 30,
      total_point: 35,
    };

    const result = applyResultInsert([matchWithResults], payload, playersCache);

    expect(result).not.toBeNull();
    expect(result![0].results).toHaveLength(1);
    expect(result![0]).toBe(matchWithResults);
  });
});
