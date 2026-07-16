import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({ getAuthUser: mockGetAuthUser }));

const mockFrom = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }),
}));

import { DELETE } from "./route";

function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "single"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const makeRequest = (id: string) =>
  new NextRequest(`http://localhost/api/matches/${id}`, { method: "DELETE" });
const makeParams = (id: string) => Promise.resolve({ id });

describe("DELETE /api/matches/[id]", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockGetAuthUser.mockReset();
    mockGetAuthUser.mockResolvedValue({ id: "owner-1" });
  });

  it("401: 未ログインはDBへアクセスせず拒否する", async () => {
    mockGetAuthUser.mockResolvedValueOnce(null);
    const response = await DELETE(makeRequest("match-1"), { params: makeParams("match-1") });
    expect(response.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("404: 対局が存在しない", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "PGRST116" } }));
    const response = await DELETE(makeRequest("missing"), { params: makeParams("missing") });
    expect(response.status).toBe(404);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("403: 大会オーナー以外は削除できない", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "other" }, error: null }));
    const response = await DELETE(makeRequest("match-1"), { params: makeParams("match-1") });
    expect(response.status).toBe(403);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("200: 削除と再採番をRPCへ委譲する", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ error: null });

    const response = await DELETE(makeRequest("match-1"), { params: makeParams("match-1") });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_match_and_renumber", {
      p_match_id: "match-1",
      p_tournament_id: "t1",
    });
  });

  it("500: RPCが失敗した場合は削除失敗を返す", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ error: { message: "boom" } });

    const response = await DELETE(makeRequest("match-1"), { params: makeParams("match-1") });
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("削除に失敗しました");
  });
});
