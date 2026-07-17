import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCheckRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({ getAuthUser: mockGetAuthUser }));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { POST } from "./route";

function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (r: (v: unknown) => unknown) => Promise<unknown> }).then = (
    resolve: (v: unknown) => unknown
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

const T_ID = "my-tournament";
const OWNER = { id: "00000000-0000-4000-8000-0000000000aa" };

function callPost() {
  const req = new NextRequest(`http://localhost/api/tournaments/${T_ID}/write-token`, {
    method: "POST",
  });
  return POST(req, { params: Promise.resolve({ id: T_ID }) });
}

describe("POST /api/tournaments/[id]/write-token", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockCheckRateLimit.mockReset();
    mockGetAuthUser.mockReset();
    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockGetAuthUser.mockResolvedValue(OWNER);
  });

  it("429: レート制限に引っかかったら何もしない", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ ok: false });
    const res = await callPost();
    expect(res.status).toBe(429);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("401: 未ログインは再発行できない", async () => {
    mockGetAuthUser.mockResolvedValueOnce(null);
    const res = await callPost();
    expect(res.status).toBe(401);
  });

  it("403: オーナー以外は再発行できない", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { owner_id: "someone-else" }, error: null }));
    const res = await callPost();
    expect(res.status).toBe(403);
  });

  it("200: オーナーは再発行でき、raw トークンが一度だけ返る", async () => {
    const upsertChain = makeChain({ error: null });
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { owner_id: OWNER.id }, error: null })) // オーナー確認
      .mockReturnValueOnce(upsertChain); // token_hash の upsert

    const res = await callPost();

    expect(res.status).toBe(200);
    const { writeToken } = await res.json();
    expect(writeToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // 保存されるのはハッシュのみ（raw を保存しない）
    const upserted = (upsertChain.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      tournament_id: string;
      token_hash: string;
    };
    expect(upserted.tournament_id).toBe(T_ID);
    expect(upserted.token_hash).not.toBe(writeToken);
    expect(upserted.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
