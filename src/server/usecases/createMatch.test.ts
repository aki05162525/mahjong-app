import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }),
}));

import { createMatch } from "./createMatch";
import type { CreateMatchInput } from "@/server/validation/match";

const T_ID = "00000000-0000-4000-8000-000000000001";
const RULE_ID = "00000000-0000-4000-8000-000000000002";
const TABLE_ID = "00000000-0000-4000-8000-000000000003";
const P1 = "00000000-0000-4000-8000-000000000011";
const P2 = "00000000-0000-4000-8000-000000000012";
const P3 = "00000000-0000-4000-8000-000000000013";
const P4 = "00000000-0000-4000-8000-000000000014";

const validInput: CreateMatchInput = {
  tournamentId: T_ID,
  ruleId: RULE_ID,
  roundNumber: 1,
  inputs: [
    { playerId: P1, score: 40000 },
    { playerId: P2, score: 30000 },
    { playerId: P3, score: 20000 },
    { playerId: P4, score: 10000 },
  ],
};

const mockRule = { uma: [20, 10, -10, -20], return_points: 30000 };

// カウントクエリ用チェーン (.select().eq().eq() or .in())
function makeCountChain(count: number | null) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "head"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ count }).then(resolve);
  return chain;
}

// single()で終わるクエリ用チェーン
function makeSingleChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve);
  return chain;
}

// 正常系の全DBコールをセットアップ (tableId省略 = 単一卓)
function setupHappyPath(matchId = "match-id") {
  mockFrom
    .mockReturnValueOnce(makeCountChain(1)) // tables: 1卓のみ
    .mockReturnValueOnce(makeCountChain(4)) // players: 4人全員存在
    .mockReturnValueOnce(makeSingleChain(mockRule)); // rules: ルール取得
  mockRpc.mockResolvedValueOnce({ data: matchId, error: null });
}

describe("createMatch", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("プレイヤーが重複していれば badRequest を throw する", async () => {
    const input: CreateMatchInput = {
      ...validInput,
      inputs: [
        { playerId: P1, score: 40000 },
        { playerId: P1, score: 30000 }, // 重複
        { playerId: P3, score: 20000 },
        { playerId: P4, score: 10000 },
      ],
    };
    const error = await createMatch(input).catch((e) => e);
    expect(error.code).toBe("bad_request");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("スコア合計が100,000点でなければ badRequest を throw する", async () => {
    const input: CreateMatchInput = {
      ...validInput,
      inputs: [
        { playerId: P1, score: 40000 },
        { playerId: P2, score: 30000 },
        { playerId: P3, score: 20000 },
        { playerId: P4, score: 5000 }, // 合計95,000
      ],
    };
    const error = await createMatch(input).catch((e) => e);
    expect(error.code).toBe("bad_request");
    expect(error.message).toContain("95,000");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("指定した tableId が存在しなければ notFound を throw する", async () => {
    mockFrom.mockReturnValueOnce(makeCountChain(0)); // tables: 見つからない
    const error = await createMatch({ ...validInput, tableId: TABLE_ID }).catch((e) => e);
    expect(error.code).toBe("not_found");
  });

  it("tableId 省略 + 2卓以上なら badRequest を throw する", async () => {
    mockFrom.mockReturnValueOnce(makeCountChain(2)); // tables: 2卓ある
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("bad_request");
    expect(error.message).toBe("卓を選択してください");
  });

  it("プレイヤーが存在しなければ notFound を throw する", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(1)) // tables: OK
      .mockReturnValueOnce(makeCountChain(3)); // players: 3人しかいない
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("not_found");
  });

  it("ルールが存在しなければ notFound を throw する", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(1)) // tables: OK
      .mockReturnValueOnce(makeCountChain(4)) // players: OK
      .mockReturnValueOnce(makeSingleChain(null)); // rules: 見つからない
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("not_found");
  });

  it("RPC 失敗なら internalError を throw する", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(1))
      .mockReturnValueOnce(makeCountChain(4))
      .mockReturnValueOnce(makeSingleChain(mockRule));
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("internal_error");
  });

  it("正常系: match の id を返す", async () => {
    setupHappyPath("new-match-id");
    const result = await createMatch(validInput);
    expect(result).toEqual({ id: "new-match-id" });
  });

  it("正常系: tableId を指定した場合も match の id を返す", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(1)) // tables: 卓が存在する
      .mockReturnValueOnce(makeCountChain(4)) // players: OK
      .mockReturnValueOnce(makeSingleChain(mockRule)); // rules: OK
    mockRpc.mockResolvedValueOnce({ data: "match-with-table", error: null });
    const result = await createMatch({ ...validInput, tableId: TABLE_ID });
    expect(result).toEqual({ id: "match-with-table" });
  });

  it("tableId を指定したとき卓が存在しなければ notFound を throw する (count=0)", async () => {
    mockFrom.mockReturnValueOnce(makeCountChain(0)); // tables: 0件
    const error = await createMatch({ ...validInput, tableId: TABLE_ID }).catch((e) => e);
    expect(error.code).toBe("not_found");
  });

  it("tableId 指定時の tables クエリがエラーなら internalError を throw する", async () => {
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "head"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ count: null, error: { message: "db error" } }).then(resolve);
    mockFrom.mockReturnValueOnce(chain);
    const error = await createMatch({ ...validInput, tableId: TABLE_ID }).catch((e) => e);
    expect(error.code).toBe("internal_error");
  });

  it("tableId 省略時の tables クエリがエラーなら internalError を throw する", async () => {
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "head"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ count: null, error: { message: "db error" } }).then(resolve);
    mockFrom.mockReturnValueOnce(chain);
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("internal_error");
  });

  it("players クエリがエラーなら internalError を throw する", async () => {
    const errChain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "head"]) {
      errChain[m] = vi.fn().mockReturnValue(errChain);
    }
    errChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ count: null, error: { message: "db error" } }).then(resolve);
    mockFrom
      .mockReturnValueOnce(makeCountChain(1)) // tables: OK
      .mockReturnValueOnce(errChain); // players: エラー
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("internal_error");
  });

  it("rules クエリがエラー(PGRST116以外)なら internalError を throw する", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(1)) // tables: OK
      .mockReturnValueOnce(makeCountChain(4)) // players: OK
      .mockReturnValueOnce(makeSingleChain(null, { code: "OTHER_CODE", message: "db error" })); // rules: エラー
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("internal_error");
  });

  it("rules クエリが PGRST116 エラーなら notFound を throw する (行なし扱い)", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(1)) // tables: OK
      .mockReturnValueOnce(makeCountChain(4)) // players: OK
      .mockReturnValueOnce(makeSingleChain(null, { code: "PGRST116", message: "0 rows" })); // rules: 行なし
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("not_found");
  });

  it("RPC がデータなし・エラーなし(null)を返した場合は internalError を throw する", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(1))
      .mockReturnValueOnce(makeCountChain(4))
      .mockReturnValueOnce(makeSingleChain(mockRule));
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const error = await createMatch(validInput).catch((e) => e);
    expect(error.code).toBe("internal_error");
  });

  it("RPC が正しいパラメータで呼ばれることを検証する", async () => {
    setupHappyPath("rpc-param-check-id");
    await createMatch(validInput);
    expect(mockRpc).toHaveBeenCalledWith(
      "create_match_with_results",
      expect.objectContaining({
        p_tournament_id: T_ID,
        p_round_number: 1,
        p_rule_id: RULE_ID,
        p_uma: mockRule.uma,
        p_return_points: mockRule.return_points,
        p_table_id: null, // tableId 省略なので null
      })
    );
  });

  it("RPC の p_results に player_id・score・rank が含まれることを検証する", async () => {
    setupHappyPath("rpc-results-check-id");
    await createMatch(validInput);
    const call = mockRpc.mock.calls[0];
    const pResults = (call[1] as { p_results: Array<Record<string, unknown>> }).p_results;
    expect(pResults).toHaveLength(4);
    expect(pResults[0]).toHaveProperty("player_id");
    expect(pResults[0]).toHaveProperty("score");
    expect(pResults[0]).toHaveProperty("rank");
    expect(pResults[0]).toHaveProperty("base_point");
    expect(pResults[0]).toHaveProperty("uma_point");
    expect(pResults[0]).toHaveProperty("oka_point");
    expect(pResults[0]).toHaveProperty("total_point");
  });

  it("tableId 省略時に tables カウントが 0 なら卓なし大会として正常に続行する", async () => {
    mockFrom
      .mockReturnValueOnce(makeCountChain(0)) // tables: 0件 → 卓なし大会として通過
      .mockReturnValueOnce(makeCountChain(4)) // players: OK
      .mockReturnValueOnce(makeSingleChain(mockRule)); // rules: OK
    mockRpc.mockResolvedValueOnce({ data: "no-table-match-id", error: null });
    const result = await createMatch(validInput);
    expect(result).toEqual({ id: "no-table-match-id" });
  });
});
