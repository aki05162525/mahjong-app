import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ ok: true }) }));

const mockFrom = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }),
}));

import { POST } from "./route";

function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "in", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (r: (v: unknown) => unknown) => Promise<unknown> }).then = (
    resolve: (v: unknown) => unknown
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const T_ID = "00000000-0000-4000-8000-000000000001";
const RULE_ID = "00000000-0000-4000-8000-000000000002";
const TABLE_ID = "00000000-0000-4000-8000-000000000003";
const P1 = "00000000-0000-4000-8000-000000000011";
const P2 = "00000000-0000-4000-8000-000000000012";
const P3 = "00000000-0000-4000-8000-000000000013";
const P4 = "00000000-0000-4000-8000-000000000014";

const validInputs = [
  { playerId: P1, score: 42000 },
  { playerId: P2, score: 31000 },
  { playerId: P3, score: 18000 },
  { playerId: P4, score: 9000 },
];

const baseBody = { tournamentId: T_ID, tableId: TABLE_ID, roundNumber: 1, ruleId: RULE_ID };
const ruleRow = { uma: [20, 10, -10, -20], return_points: 30000 };

describe("POST /api/matches", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("400: 入力が不正なとき parseCreateMatch が弾く", async () => {
    const res = await POST(makeReq({ ...baseBody, roundNumber: 0, inputs: validInputs }));
    expect(res.status).toBe(400);
  });

  it("404: ビジネスルール違反のとき createMatch が弾く", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ count: 0 })); // 卓が存在しない
    const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
    expect(res.status).toBe(404);
  });

  it("200: 正常系で id を返す", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ count: 1 })) // tables: OK
      .mockReturnValueOnce(makeChain({ count: 4 })) // players: OK
      .mockReturnValueOnce(makeChain({ data: ruleRow, error: null })); // rules: OK
    mockRpc.mockResolvedValueOnce({ data: "match-id", error: null });

    const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("match-id");
  });

  it("500: RPC がエラーを返したとき 500 を返す", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ count: 1 })) // tables: OK
      .mockReturnValueOnce(makeChain({ count: 4 })) // players: OK
      .mockReturnValueOnce(makeChain({ data: ruleRow, error: null })); // rules: OK
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "db error" } });

    const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
    expect(res.status).toBe(500);
  });

  it("400: players が 4 人未満のとき 400 を返す", async () => {
    // inputs に 3 人しかいない (Zod スキーマが length(4) で弾く)
    const threeInputs = validInputs.slice(0, 3);
    const res = await POST(makeReq({ ...baseBody, inputs: threeInputs }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("400: roundNumber が 0 以下のとき 400 を返す", async () => {
    const res = await POST(makeReq({ ...baseBody, roundNumber: -1, inputs: validInputs }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("400: ruleId が UUID 形式でなければ 400 を返す", async () => {
    const res = await POST(makeReq({ ...baseBody, ruleId: "not-a-uuid", inputs: validInputs }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("400: inputs の playerId が UUID でなければ 400 を返す", async () => {
    const badInputs = [
      { playerId: "bad-id", score: 42000 },
      { playerId: P2, score: 31000 },
      { playerId: P3, score: 18000 },
      { playerId: P4, score: 9000 },
    ];
    const res = await POST(makeReq({ ...baseBody, inputs: badInputs }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("200: tableId を省略したリクエストも正常に処理できる", async () => {
    const bodyWithoutTable = { tournamentId: T_ID, roundNumber: 1, ruleId: RULE_ID };
    mockFrom
      .mockReturnValueOnce(makeChain({ count: 1 })) // tables: 1卓のみ
      .mockReturnValueOnce(makeChain({ count: 4 })) // players: OK
      .mockReturnValueOnce(makeChain({ data: ruleRow, error: null })); // rules: OK
    mockRpc.mockResolvedValueOnce({ data: "no-table-match-id", error: null });

    const res = await POST(makeReq({ ...bodyWithoutTable, inputs: validInputs }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("no-table-match-id");
  });

  it("400: スコア合計が 100,000 点にならないとき 400 を返す (DB 呼び出しなし)", async () => {
    const badScoreInputs = [
      { playerId: P1, score: 42000 },
      { playerId: P2, score: 31000 },
      { playerId: P3, score: 18000 },
      { playerId: P4, score: 5000 }, // 合計 96,000
    ];
    const res = await POST(makeReq({ ...baseBody, inputs: badScoreInputs }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
