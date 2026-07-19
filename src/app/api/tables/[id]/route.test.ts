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
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "in", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (r: (v: unknown) => unknown) => Promise<unknown> }).then = (
    resolve: (v: unknown) => unknown
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/tables/tb1", { method: "DELETE" });
}

const makeParams = (id: string) => Promise.resolve({ id });

beforeEach(() => {
  mockFrom.mockReset();
  mockGetAuthUser.mockResolvedValue({ id: "owner-1" });
});

describe("DELETE /api/tables/[id]", () => {
  it("401: 未ログインは削除できない", async () => {
    mockGetAuthUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq(), { params: makeParams("tb1") });
    expect(res.status).toBe(401);
  });

  it("404: 存在しない卓は削除できない", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "PGRST116" } }));
    const res = await DELETE(makeReq(), { params: makeParams("tb1") });
    expect(res.status).toBe(404);
  });

  it("403: オーナーでないと削除できない", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "someone-else" }, error: null }));
    const res = await DELETE(makeReq(), { params: makeParams("tb1") });
    expect(res.status).toBe(403);
  });

  it("409: 対局に記録されている卓は削除できない", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: { code: "23503" } }));
    const res = await DELETE(makeReq(), { params: makeParams("tb1") });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/対局/);
  });

  it("200: 対局のない卓は削除できる", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: null }));
    const res = await DELETE(makeReq(), { params: makeParams("tb1") });
    expect(res.status).toBe(200);
  });
});
