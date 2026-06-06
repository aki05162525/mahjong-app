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
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null })) // tournament
      .mockReturnValueOnce(makeChain({ data: { id: "rule-new" }, error: null })); // insert
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("rule-new");
  });

  it("200: isDefault=true のとき、既存のデフォルトを解除してから作成する", async () => {
    const unsetChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { owner_id: "owner-1" }, error: null })) // tournament
      .mockReturnValueOnce(unsetChain) // 既存デフォルト解除
      .mockReturnValueOnce(makeChain({ data: { id: "rule-new" }, error: null })); // insert

    await POST(makeReq({ ...validBody, isDefault: true }));

    // is_default: false に更新する呼び出しがあること
    expect(unsetChain.update as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({
      is_default: false,
    });
  });
});
