import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({
  getAuthUser: mockGetAuthUser,
}));

const mockFrom = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }),
}));

import { PATCH, DELETE } from "./route";

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

function makeReq(body?: object) {
  return new NextRequest("http://localhost/api/rules/r1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const makeParams = (id: string) => Promise.resolve({ id });

const validBody = { name: "10-30", uma: [30, 10, -10, -30], returnPoints: 30000, isDefault: false };

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockGetAuthUser.mockResolvedValue({ id: "owner-1" });
});

describe("DELETE /api/rules/[id]", () => {
  it("401: 未ログインは削除できない", async () => {
    mockGetAuthUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq(), { params: makeParams("r1") });
    expect(res.status).toBe(401);
  });

  it("403: オーナーでないと削除できない", async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { tournament_id: "t1", is_default: false }, error: null })
      )
      .mockReturnValueOnce(makeChain({ data: { owner_id: "someone-else" }, error: null }));
    const res = await DELETE(makeReq(), { params: makeParams("r1") });
    expect(res.status).toBe(403);
  });

  it("400: デフォルトルールは削除できない", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "default_required", error: null });
    const res = await DELETE(makeReq(), { params: makeParams("r1") });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/デフォルト/);
  });

  it("200: デフォルトでないルールは削除できる", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "deleted", error: null });
    const res = await DELETE(makeReq(), { params: makeParams("r1") });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/rules/[id]", () => {
  it("400: ウマの合計が0でないと更新できない", async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { tournament_id: "t1", is_default: false }, error: null })
      )
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    const res = await PATCH(makeReq({ ...validBody, uma: [30, 10, -10, -20] }), {
      params: makeParams("r1"),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/合計/);
  });

  it("200: 正常に更新できる", async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { tournament_id: "t1", is_default: false }, error: null })
      )
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "updated", error: null });
    const res = await PATCH(makeReq(validBody), { params: makeParams("r1") });
    expect(res.status).toBe(200);
  });

  it("200: isDefault=true の更新を原子的なRPCへ委譲する", async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { tournament_id: "t1", is_default: false }, error: null })
      )
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "updated", error: null });

    await PATCH(makeReq({ ...validBody, isDefault: true }), { params: makeParams("r1") });

    expect(mockRpc).toHaveBeenCalledWith(
      "update_rule_atomic",
      expect.objectContaining({ p_rule_id: "r1", p_is_default: true })
    );
  });

  it("200: isDefault省略時は現在値を変更しない", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "updated", error: null });

    const body = {
      name: validBody.name,
      uma: validBody.uma,
      returnPoints: validBody.returnPoints,
    };
    const res = await PATCH(makeReq(body), { params: makeParams("r1") });

    expect(res.status).toBe(200);
    expect(mockRpc.mock.calls[0][1]).not.toHaveProperty("p_is_default");
  });

  it("400: 現在のデフォルトを直接解除できない", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "default_required", error: null });

    const res = await PATCH(makeReq(validBody), { params: makeParams("r1") });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/デフォルト/);
  });
});
