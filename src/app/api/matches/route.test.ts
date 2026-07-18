import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCheckMatchIpLimit = vi.hoisted(() => vi.fn());
const mockConsumeTournamentWriteLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit", () => ({
  checkMatchIpLimit: mockCheckMatchIpLimit,
  consumeTournamentWriteLimit: mockConsumeTournamentWriteLimit,
}));

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

// createMatch が通る分のチェーン（tables → players → rules）+ RPC を積む
function mockCreateMatchSuccess() {
  mockFrom
    .mockReturnValueOnce(makeChain({ count: 1 })) // tables: OK
    .mockReturnValueOnce(makeChain({ count: 4 })) // players: OK
    .mockReturnValueOnce(makeChain({ data: ruleRow, error: null })); // rules: OK
  mockRpc.mockResolvedValueOnce({ data: "match-id", error: null });
}

// 認可は「大会 URL を知っていること」なので認証・トークンは不要。
// 乱用対策のレート制限（IP プレフィルタ → 大会バケット）だけを検証する。
describe("POST /api/matches", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockCheckMatchIpLimit.mockReset();
    mockConsumeTournamentWriteLimit.mockReset();
    mockCheckMatchIpLimit.mockResolvedValue({ ok: true });
    mockConsumeTournamentWriteLimit.mockResolvedValue({ ok: true });
  });

  describe("レート制限（順序固定: IP → 入力検証 → 大会バケット）", () => {
    it("429: IP プレフィルタ超過時は DB も大会バケットも触らない", async () => {
      mockCheckMatchIpLimit.mockResolvedValueOnce({ ok: false });
      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(429);
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
    });

    it("429: 大会バケットが枯渇していたら保存しない", async () => {
      mockConsumeTournamentWriteLimit.mockResolvedValueOnce({ ok: false });
      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(429);
      expect(mockConsumeTournamentWriteLimit).toHaveBeenCalledWith(T_ID);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("400: 入力が不正なときは大会バケットを消費しない", async () => {
      const res = await POST(makeReq({ ...baseBody, roundNumber: 0, inputs: validInputs }));
      expect(res.status).toBe(400);
      expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
    });
  });

  describe("バリデーションとビジネスルール", () => {
    it("404: ビジネスルール違反のとき createMatch が弾く", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ count: 0 })); // 卓が存在しない
      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(404);
    });

    it("200: 認証なし・トークンなしで記録でき、大会バケットを消費する", async () => {
      mockCreateMatchSuccess();
      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("match-id");
      expect(mockConsumeTournamentWriteLimit).toHaveBeenCalledWith(T_ID);
    });
  });
});
