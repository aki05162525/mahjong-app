import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ ok: true }) }));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: mockFrom },
}));

import { POST } from "./route";

// supabase の fluent チェーンを模倣するヘルパー
function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "in", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (r: (v: unknown) => unknown) => Promise<unknown> }).then =
    (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/players", () => {
  beforeEach(() => mockFrom.mockReset());

  it("400: 名前が空", async () => {
    const res = await POST(makeReq({ tournamentId: "t1", name: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/名前/);
  });

  it("400: 名前が 20 文字超", async () => {
    const res = await POST(makeReq({ tournamentId: "t1", name: "a".repeat(21) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/20文字/);
  });

  it("400: tournamentId が未指定", async () => {
    const res = await POST(makeReq({ name: "Alice" }));
    expect(res.status).toBe(400);
  });

  it("409: 同名プレイヤーが既に存在する", async () => {
    mockFrom.mockReturnValue(makeChain({ count: 1 }));
    const res = await POST(makeReq({ tournamentId: "t1", name: "Alice" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/重複|既に存在/);
  });

  it("200: 正常に登録できる", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ count: 0 }))
      .mockReturnValueOnce(makeChain({ data: { id: "player-id" }, error: null }));
    const res = await POST(makeReq({ tournamentId: "t1", name: "Alice" }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("player-id");
  });

  it("200: 前後の空白をトリムして登録する", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ count: 0 }))
      .mockReturnValueOnce(makeChain({ data: { id: "player-id" }, error: null }));
    const res = await POST(makeReq({ tournamentId: "t1", name: "  Bob  " }));
    expect(res.status).toBe(200);
  });
});
