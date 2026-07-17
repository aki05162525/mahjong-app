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
    mockCheckRateLimit.mockReset();
    mockGetAuthUser.mockReset();
    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockGetAuthUser.mockResolvedValue({ id: "test-user-id" });
  });

  describe("認証・レート制限", () => {
    it("401: 未ログインは大会を作れない", async () => {
      mockGetAuthUser.mockResolvedValueOnce(null);
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(401);
    });

    it("429: レート制限に引っかかったら認証・DB 処理を行わずに返す", async () => {
      mockCheckRateLimit.mockResolvedValueOnce({ ok: false });
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(429);
      expect(mockGetAuthUser).not.toHaveBeenCalled();
      expect(mockFrom).not.toHaveBeenCalled();
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
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null })) // tournament
        .mockReturnValueOnce(makeChain({ error: null })) // seed rules
        .mockReturnValueOnce(makeChain({ error: null })); // write secret
      const res = await POST(makeReq({ name: "テスト大会" }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("auto-generated-id");
    });

    it("200: カスタムIDで大会を作れる", async () => {
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "my-tournament" }, error: null })) // tournament
        .mockReturnValueOnce(makeChain({ error: null })) // seed rules
        .mockReturnValueOnce(makeChain({ error: null })); // write secret
      const res = await POST(makeReq({ name: "テスト大会", customId: "my-tournament" }));
      expect(res.status).toBe(200);
      expect((await res.json()).id).toBe("my-tournament");
    });

    it("200: 記録トークン（raw）を発行し、DB にはハッシュだけを保存する", async () => {
      const secretChain = makeChain({ error: null });
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null })) // tournament
        .mockReturnValueOnce(makeChain({ error: null })) // seed rules
        .mockReturnValueOnce(secretChain); // write secret

      const res = await POST(makeReq({ name: "テスト大会" }));

      const { writeToken } = await res.json();
      expect(writeToken).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes の base64url

      const inserted = (secretChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        tournament_id: string;
        token_hash: string;
      };
      expect(inserted.tournament_id).toBe("auto-generated-id");
      expect(inserted.token_hash).not.toBe(writeToken); // raw をそのまま保存しない
      expect(inserted.token_hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    });

    it("200: 大会作成時に標準ルールを seed し、デフォルトを含む", async () => {
      const seedChain = makeChain({ error: null });
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null })) // tournament
        .mockReturnValueOnce(seedChain) // seed rules
        .mockReturnValueOnce(makeChain({ error: null })); // write secret

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

    it("500: 記録トークンの保存に失敗したら大会を削除して 500 を返す", async () => {
      const deleteChain = makeChain({ error: null });
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { id: "auto-generated-id" }, error: null })) // tournament insert
        .mockReturnValueOnce(makeChain({ error: null })) // seed rules
        .mockReturnValueOnce(makeChain({ error: { message: "secret failed" } })) // write secret 失敗
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
