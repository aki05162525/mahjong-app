import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => Promise.resolve({ ok: true }) }));

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

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/delete-tournament", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/delete-tournament", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetAuthUser.mockResolvedValue({ id: "test-user-id" });
  });

  describe("認証・認可", () => {
    it("401: 未ログインは削除できない", async () => {
      mockGetAuthUser.mockResolvedValueOnce(null);
      const res = await POST(makeReq({ tournamentId: "t1" }));
      expect(res.status).toBe(401);
    });

    it("403: オーナー以外は削除できない", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: "other-user-id" }, error: null }));
      const res = await POST(makeReq({ tournamentId: "t1" }));
      expect(res.status).toBe(403);
    });
  });

  describe("バリデーション", () => {
    it("400: tournamentId が未指定", async () => {
      const res = await POST(makeReq({}));
      expect(res.status).toBe(400);
    });

    it("404: 存在しない大会は削除できない", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "PGRST116" } }));
      const res = await POST(makeReq({ tournamentId: "nonexistent" }));
      expect(res.status).toBe(404);
    });
  });

  describe("正常系", () => {
    it("200: オーナーは大会を削除できる", async () => {
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { owner_id: "test-user-id" }, error: null }))
        .mockReturnValueOnce(makeChain({ error: null }));
      const res = await POST(makeReq({ tournamentId: "t1" }));
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });
  });
});
