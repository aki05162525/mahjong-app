import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCheckRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({
  getAuthUser: mockGetAuthUser,
}));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  supabaseAdmin: { from: mockFrom },
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
  return new NextRequest("http://localhost/api/create-tournament", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/create-tournament", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockCheckRateLimit.mockReturnValue({ ok: true });
    mockGetAuthUser.mockResolvedValue({ id: "test-user-id" });
  });

  describe("認証・レート制限", () => {
    it("401: 未ログインは大会を作れない", async () => {
      mockGetAuthUser.mockResolvedValueOnce(null);
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(401);
    });

    it("429: レート制限に引っかかる", async () => {
      mockCheckRateLimit.mockReturnValueOnce({ ok: false });
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(429);
    });
  });

  describe("バリデーション", () => {
    it("400: 大会名が空", async () => {
      const res = await POST(makeReq({ name: "" }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/大会名/);
    });

    it("400: 大会名が 50 文字超", async () => {
      const res = await POST(makeReq({ name: "a".repeat(51) }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/50文字/);
    });

    it("400: カスタムIDに使用できない文字が含まれる", async () => {
      const res = await POST(makeReq({ name: "テスト大会", customId: "invalid id!" }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/英数字/);
    });

    it("409: カスタムIDがすでに使われている", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "23505" } }));
      const res = await POST(makeReq({ name: "テスト大会", customId: "taken-id" }));
      expect(res.status).toBe(409);
      expect((await res.json()).error).toMatch(/使われています/);
    });
  });

  describe("正常系", () => {
    it("200: 自動IDで大会を作れる", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null }));
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("auto-generated-id");
    });

    it("200: カスタムIDで大会を作れる", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: { id: "my-tournament" }, error: null }));
      const res = await POST(makeReq({ name: "テスト大会", customId: "my-tournament" }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("my-tournament");
    });
  });
});
