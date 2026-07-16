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
  return new NextRequest("http://localhost/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  tournamentId: "t1",
  name: "10-30",
  uma: [30, 10, -10, -30],
  returnPoints: 30000,
  isDefault: false,
};

describe("POST /api/rules", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockGetAuthUser.mockResolvedValue({ id: "owner-1" });
  });

  it("401: 未ログインは作成できない", async () => {
    mockGetAuthUser.mockResolvedValueOnce(null);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("403: 大会オーナーでないと作成できない", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: "someone-else" }, error: null }));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
  });

  it("400: ウマの合計が0でないと作成できない", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    const res = await POST(makeReq({ ...validBody, uma: [30, 10, -10, -20] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/合計/);
  });

  it("200: 正常に作成できる", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "rule-new", error: null });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("rule-new");
  });

  it("200: isDefault=true の作成を原子的なRPCへ委譲する", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: "rule-new", error: null });

    await POST(makeReq({ ...validBody, isDefault: true }));

    expect(mockRpc).toHaveBeenCalledWith("create_rule_atomic", {
      p_tournament_id: "t1",
      p_name: "10-30",
      p_uma: [30, 10, -10, -30],
      p_return_points: 30000,
      p_is_default: true,
    });
  });
});
