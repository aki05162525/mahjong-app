import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
  return new NextRequest("http://localhost/api/create-tournament", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/create-tournament", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetAuthUser.mockReset();
    mockGetAuthUser.mockResolvedValue({ id: "test-user-id" });
  });

  describe("認証", () => {
    it("401: 未ログインは大会を作れない", async () => {
      mockGetAuthUser.mockResolvedValueOnce(null);
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(401);
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
  });

  describe("正常系", () => {
    it("200: 大会を作れる（ID は自動生成）", async () => {
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null })) // tournament
        .mockReturnValueOnce(makeChain({ error: null })); // seed rules
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("auto-generated-id");
    });

    it("200: 大会作成時に標準ルールを seed し、デフォルトを含む", async () => {
      const seedChain = makeChain({ error: null });
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null })) // tournament
        .mockReturnValueOnce(seedChain); // seed rules

      await POST(makeReq({ name: "テスト大会" }));

      const seeded = (seedChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Array<
        Record<string, unknown>
      >;
      expect(seeded.length).toBeGreaterThan(0);
      expect(seeded.every((r) => r.tournament_id === "auto-generated-id")).toBe(true);
      expect(seeded.filter((r) => r.is_default === true)).toHaveLength(1);
    });

    it("500: ルール seed に失敗したら大会を削除して 500 を返す（中途半端な大会を残さない）", async () => {
      const deleteChain = makeChain({ error: null });
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null })) // tournament insert
        .mockReturnValueOnce(makeChain({ error: { message: "seed failed" } })) // seed rules 失敗
        .mockReturnValueOnce(deleteChain); // ロールバックの delete

      const res = await POST(makeReq({ name: "テスト大会" }));

      expect(res.status).toBe(500);
      expect(deleteChain.delete as ReturnType<typeof vi.fn>).toHaveBeenCalled();
      expect(deleteChain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        "id",
        "auto-generated-id"
      );
    });
  });
});
