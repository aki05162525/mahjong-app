import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ ok: true }) }));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: mockFrom },
}));

import { POST } from "./route";

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
  return new NextRequest("http://localhost/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// 合計ちょうど 100,000 点になる 4 人分の入力
const validInputs = [
  { playerId: "p1", score: 42000 },
  { playerId: "p2", score: 31000 },
  { playerId: "p3", score: 18000 },
  { playerId: "p4", score: 9000 },
];

const baseBody = { tournamentId: "t1", tableId: "tb1", roundNumber: 1 };

// DB が正常なときのモック設定
function setupSuccessDb() {
  mockFrom
    .mockReturnValueOnce(makeChain({ count: 1 }))    // tables: 卓が存在する
    .mockReturnValueOnce(makeChain({ count: 4 }))    // players: 4人全員が存在する
    .mockReturnValueOnce(makeChain({ data: { id: "match-id" }, error: null }))  // matches: insert
    .mockReturnValueOnce(makeChain({ data: null, error: null }));               // match_results: insert
}

describe("POST /api/matches — 入力バリデーション（DB 不要）", () => {
  beforeEach(() => mockFrom.mockReset());

  it("400: inputs が 3 件（4 件未満）", async () => {
    const res = await POST(makeReq({ ...baseBody, inputs: validInputs.slice(0, 3) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/4件/);
  });

  it("400: inputs が 5 件（4 件超）", async () => {
    const res = await POST(makeReq({
      ...baseBody,
      inputs: [...validInputs, { playerId: "p5", score: 0 }],
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/4件/);
  });

  it("400: roundNumber が 0（正の整数でない）", async () => {
    const res = await POST(makeReq({ ...baseBody, roundNumber: 0, inputs: validInputs }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/回戦番号/);
  });

  it("400: roundNumber が小数（整数でない）", async () => {
    const res = await POST(makeReq({ ...baseBody, roundNumber: 1.5, inputs: validInputs }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/回戦番号/);
  });

  it("400: playerId が重複している", async () => {
    const res = await POST(makeReq({
      ...baseBody,
      inputs: [
        { playerId: "p1", score: 42000 },
        { playerId: "p1", score: 31000 },  // 重複
        { playerId: "p3", score: 18000 },
        { playerId: "p4", score: 9000 },
      ],
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/重複/);
  });

  it("400: 合計点数が 100,000 点でない", async () => {
    const res = await POST(makeReq({
      ...baseBody,
      inputs: [
        { playerId: "p1", score: 40000 },
        { playerId: "p2", score: 30000 },
        { playerId: "p3", score: 20000 },
        { playerId: "p4", score: 9000 },   // 合計 99,000
      ],
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/点数合計/);
  });
});

describe("POST /api/matches — DB バリデーション", () => {
  beforeEach(() => mockFrom.mockReset());

  it("400: tableId が当該大会に存在しない", async () => {
    mockFrom.mockReturnValue(makeChain({ count: 0 }));  // 卓が見つからない
    const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/卓/);
  });

  it("400: playerId の一部が当該大会に存在しない", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ count: 1 }))   // 卓は存在する
      .mockReturnValueOnce(makeChain({ count: 3 }));  // 4人中3人しか見つからない
    const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/プレイヤー/);
  });

  it("200: 正常な対局結果を保存できる", async () => {
    setupSuccessDb();
    const res = await POST(makeReq({ ...baseBody, inputs: validInputs }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("match-id");
  });

  it("200: match_results に 4 件の結果が insert される", async () => {
    const insertChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(makeChain({ count: 1 }))
      .mockReturnValueOnce(makeChain({ count: 4 }))
      .mockReturnValueOnce(makeChain({ data: { id: "match-id" }, error: null }))
      .mockReturnValueOnce(insertChain);

    await POST(makeReq({ ...baseBody, inputs: validInputs }));

    // match_results の insert が呼ばれた際の引数を確認
    const insertCall = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as unknown[];
    expect(insertCall).toHaveLength(4);
  });
});
