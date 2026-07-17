import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { generateWriteToken } from "@/server/auth/writeToken";

const mockCheckMatchIpLimit = vi.hoisted(() => vi.fn());
const mockConsumeTournamentWriteLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit", () => ({
  checkMatchIpLimit: mockCheckMatchIpLimit,
  consumeTournamentWriteLimit: mockConsumeTournamentWriteLimit,
}));

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({ getAuthUser: mockGetAuthUser }));

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

function makeReq(body: object, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
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
const OWNER = { id: "00000000-0000-4000-8000-0000000000aa" };

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

describe("POST /api/matches", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockGetAuthUser.mockReset();
    mockCheckMatchIpLimit.mockReset();
    mockConsumeTournamentWriteLimit.mockReset();
    mockCheckMatchIpLimit.mockResolvedValue({ ok: true });
    mockConsumeTournamentWriteLimit.mockResolvedValue({ ok: true });
    mockGetAuthUser.mockResolvedValue(null);
  });

  describe("認可とレート制限（順序固定: IP → token || owner → 大会バケット）", () => {
    it("429: IP プレフィルタ超過時はトークン照合も DB も触らない", async () => {
      mockCheckMatchIpLimit.mockResolvedValueOnce({ ok: false });
      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(429);
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
    });

    it("401 INVALID_WRITE_TOKEN: 無効トークンは拒否し、大会バケットを消費しない", async () => {
      const { hash } = generateWriteToken(); // 提示トークンとは別のハッシュが保存されている
      mockFrom.mockReturnValueOnce(makeChain({ data: { token_hash: hash }, error: null }));

      const res = await POST(
        makeReq({ ...baseBody, inputs: validInputs }, { "x-write-token": "wrong-token" })
      );

      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe("INVALID_WRITE_TOKEN");
      expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("200: 有効トークンで記録でき、大会バケットを消費する", async () => {
      const { raw, hash } = generateWriteToken();
      mockFrom.mockReturnValueOnce(makeChain({ data: { token_hash: hash }, error: null }));
      mockCreateMatchSuccess();

      const res = await POST(
        makeReq({ ...baseBody, inputs: validInputs }, { "x-write-token": raw })
      );

      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("match-id");
      expect(mockConsumeTournamentWriteLimit).toHaveBeenCalledWith(T_ID);
    });

    it("200: トークン無しでもログイン済みオーナーなら記録できる", async () => {
      mockGetAuthUser.mockResolvedValue(OWNER);
      mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: OWNER.id }, error: null }));
      mockCreateMatchSuccess();

      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));

      expect(res.status).toBe(200);
      expect(mockConsumeTournamentWriteLimit).toHaveBeenCalledWith(T_ID);
    });

    it("401: トークン無し・未ログインは拒否する", async () => {
      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe("unauthorized");
      expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
    });

    it("200: 無効トークンでもログイン済みオーナーなら記録できる（token || owner）", async () => {
      const { hash } = generateWriteToken();
      mockGetAuthUser.mockResolvedValue(OWNER);
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { token_hash: hash }, error: null })) // トークン照合: 不一致
        .mockReturnValueOnce(makeChain({ data: { owner_id: OWNER.id }, error: null })); // オーナー確認: OK
      mockCreateMatchSuccess();

      const res = await POST(
        makeReq({ ...baseBody, inputs: validInputs }, { "x-write-token": "wrong-token" })
      );

      expect(res.status).toBe(200);
    });

    it("429: 大会バケットが枯渇していたら保存しない", async () => {
      const { raw, hash } = generateWriteToken();
      mockFrom.mockReturnValueOnce(makeChain({ data: { token_hash: hash }, error: null }));
      mockConsumeTournamentWriteLimit.mockResolvedValueOnce({ ok: false });

      const res = await POST(
        makeReq({ ...baseBody, inputs: validInputs }, { "x-write-token": raw })
      );

      expect(res.status).toBe(429);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("バリデーションとビジネスルール（オーナーとして通過後）", () => {
    beforeEach(() => {
      mockGetAuthUser.mockResolvedValue(OWNER);
    });

    it("400: 入力が不正なとき parseCreateMatch が弾く", async () => {
      const res = await POST(makeReq({ ...baseBody, roundNumber: 0, inputs: validInputs }));
      expect(res.status).toBe(400);
    });

    it("404: ビジネスルール違反のとき createMatch が弾く", async () => {
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { owner_id: OWNER.id }, error: null })) // オーナー確認
        .mockReturnValueOnce(makeChain({ count: 0 })); // 卓が存在しない
      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(404);
    });

    it("200: 正常系で id を返す", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: OWNER.id }, error: null }));
      mockCreateMatchSuccess();

      const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("match-id");
    });
  });
});
