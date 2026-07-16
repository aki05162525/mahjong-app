import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ ok: true }) }));

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({
  getAuthUser: mockGetAuthUser,
}));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
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

function ownerChain() {
  return makeChain({ data: { owner_id: "test-user-id" }, error: null });
}

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/players", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetAuthUser.mockResolvedValue({ id: "test-user-id" });
  });

  describe("認証・認可", () => {
    it("401: 未ログインは拒否される", async () => {
      mockGetAuthUser.mockResolvedValueOnce(null);
      const res = await POST(makeReq({ tournamentId: "t1", name: "Alice" }));
      expect(res.status).toBe(401);
    });

    it("403: オーナー以外は拒否される", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: "other-user-id" }, error: null }));
      const res = await POST(makeReq({ tournamentId: "t1", name: "Alice" }));
      expect(res.status).toBe(403);
    });
  });

  describe("バリデーション", () => {
    it("400: tournamentId が未指定", async () => {
      const res = await POST(makeReq({ name: "Alice" }));
      expect(res.status).toBe(400);
    });

    it("400: 名前が空", async () => {
      mockFrom.mockReturnValueOnce(ownerChain());
      const res = await POST(makeReq({ tournamentId: "t1", name: "" }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/名前/);
    });

    it("400: 名前が 20 文字超", async () => {
      mockFrom.mockReturnValueOnce(ownerChain());
      const res = await POST(makeReq({ tournamentId: "t1", name: "a".repeat(21) }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/20文字/);
    });

    it("409: 同名プレイヤーが既に存在する", async () => {
      mockFrom
        .mockReturnValueOnce(ownerChain())
        .mockReturnValueOnce(makeChain({ data: null, error: { code: "23505" } }));
      const res = await POST(makeReq({ tournamentId: "t1", name: "Alice" }));
      expect(res.status).toBe(409);
      expect((await res.json()).error).toMatch(/重複|既に存在/);
    });
  });

  describe("正常系", () => {
    it("200: 正常に登録できる", async () => {
      mockFrom
        .mockReturnValueOnce(ownerChain())
        .mockReturnValueOnce(makeChain({ data: { id: "player-id" }, error: null }));
      const res = await POST(makeReq({ tournamentId: "t1", name: "Alice" }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("player-id");
    });

    it("200: 前後の空白をトリムして登録する", async () => {
      mockFrom
        .mockReturnValueOnce(ownerChain())
        .mockReturnValueOnce(makeChain({ data: { id: "player-id" }, error: null }));
      const res = await POST(makeReq({ tournamentId: "t1", name: "  Bob  " }));
      expect(res.status).toBe(200);
    });
  });
});
