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

import { DELETE } from "./route";

function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "in", "gt", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (r: (v: unknown) => unknown) => Promise<unknown> }).then = (
    resolve: (v: unknown) => unknown
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

function makeReq(matchId: string) {
  return new NextRequest(`http://localhost/api/matches/${matchId}`, {
    method: "DELETE",
  });
}

function makeParams(id: string) {
  return Promise.resolve({ id });
}

describe("DELETE /api/matches/[id]", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetAuthUser.mockResolvedValue({ id: "test-user-id" });
  });

  describe("認証・認可", () => {
    it("401: 未ログインは対局を削除できない", async () => {
      mockGetAuthUser.mockResolvedValueOnce(null);
      const res = await DELETE(makeReq("match-1"), { params: makeParams("match-1") });
      expect(res.status).toBe(401);
    });

    it("403: オーナー以外は対局を削除できない", async () => {
      mockFrom
        .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
        .mockReturnValueOnce(makeChain({ data: { owner_id: "other-user-id" }, error: null }));
      const res = await DELETE(makeReq("match-1"), { params: makeParams("match-1") });
      expect(res.status).toBe(403);
    });
  });

  describe("バリデーション", () => {
    it("404: 存在しない対局は削除できない", async () => {
      mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "PGRST116" } }));
      const res = await DELETE(makeReq("nonexistent"), { params: makeParams("nonexistent") });
      expect(res.status).toBe(404);
    });
  });

  describe("正常系", () => {
    it("200: オーナーは対局を削除できる（5人以上は繰り上げなし）", async () => {
      mockFrom
        .mockReturnValueOnce(
          makeChain({ data: { tournament_id: "t1", round_number: 2 }, error: null })
        )
        .mockReturnValueOnce(makeChain({ data: { owner_id: "test-user-id" }, error: null }))
        .mockReturnValueOnce(makeChain({ error: null })) // delete
        .mockReturnValueOnce(makeChain({ count: 5 })); // 登録5人 → 回戦は手動採番なので触らない
      const res = await DELETE(makeReq("match-1"), { params: makeParams("match-1") });
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      // 後続の取得・更新は走らない
      expect(mockFrom).toHaveBeenCalledTimes(4);
    });

    it("200: 4人モードでは削除した回戦より後ろを1つずつ繰り上げる", async () => {
      mockFrom
        .mockReturnValueOnce(
          makeChain({ data: { tournament_id: "t1", round_number: 2 }, error: null })
        )
        .mockReturnValueOnce(makeChain({ data: { owner_id: "test-user-id" }, error: null }))
        .mockReturnValueOnce(makeChain({ error: null })) // delete
        .mockReturnValueOnce(makeChain({ count: 4 })) // 登録ちょうど4人
        .mockReturnValueOnce(
          makeChain({
            data: [
              { id: "m4", round_number: 3 },
              { id: "m5", round_number: 4 },
            ],
          })
        ) // 第3を消したので第4・第5が後続
        .mockReturnValueOnce(makeChain({ error: null })) // update m4 → 第3
        .mockReturnValueOnce(makeChain({ error: null })); // update m5 → 第4
      const res = await DELETE(makeReq("match-1"), { params: makeParams("match-1") });
      expect(res.status).toBe(200);
      // 後続2件ぶんの update が走る
      expect(mockFrom).toHaveBeenCalledTimes(7);
    });
  });
});
