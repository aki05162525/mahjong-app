import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

const mockCheckRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));

const mockRequireTournamentOwner = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth/requireTournamentOwner", () => ({
  requireTournamentOwner: mockRequireTournamentOwner,
}));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { reissueWriteToken } from "./reissueWriteToken";

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

describe("reissueWriteToken", () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReset();
    mockRequireTournamentOwner.mockReset();
    mockFrom.mockReset();

    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockRequireTournamentOwner.mockResolvedValue(OWNER);
  });

  it("レート制限に引っかかったら rate_limited(429) を throw し、オーナー確認も DB も触らない", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ ok: false });

    const error = await reissueWriteToken(T_ID, "1.2.3.4").catch((e) => e);

    expect(error.code).toBe("rate_limited");
    expect(error.status).toBe(429);
    expect(mockRequireTournamentOwner).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("オーナーでなければ requireTournamentOwner の例外がそのまま伝播する", async () => {
    const forbiddenError = Object.assign(new Error("forbidden"), {
      code: "forbidden",
      status: 403,
    });
    mockRequireTournamentOwner.mockRejectedValueOnce(forbiddenError);

    const error = await reissueWriteToken(T_ID, "1.2.3.4").catch((e) => e);

    expect(error.code).toBe("forbidden");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("upsert が失敗したら internalError(500) を throw する", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ error: { message: "db error" } }));

    const error = await reissueWriteToken(T_ID, "1.2.3.4").catch((e) => e);

    expect(error.code).toBe("internal_error");
    expect(error.status).toBe(500);
  });

  it("成功時: requireTournamentOwner を呼び、raw トークンを返し、DB にはハッシュだけを upsert する", async () => {
    const upsertChain = makeChain({ error: null });
    mockFrom.mockReturnValueOnce(upsertChain);

    const result = await reissueWriteToken(T_ID, "1.2.3.4");

    expect(mockRequireTournamentOwner).toHaveBeenCalledWith(T_ID);
    expect(result.writeToken).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes の base64url

    const upserted = (upsertChain.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      tournament_id: string;
      token_hash: string;
    };
    expect(upserted.tournament_id).toBe(T_ID);
    expect(upserted.token_hash).not.toBe(result.writeToken); // raw をそのまま保存しない
    expect(upserted.token_hash).toBe(createHash("sha256").update(result.writeToken).digest("hex"));
  });

  it("毎回異なる raw トークンを発行する（再発行で旧リンクが失効する）", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ error: null }))
      .mockReturnValueOnce(makeChain({ error: null }));

    const first = await reissueWriteToken(T_ID, "1.2.3.4");
    const second = await reissueWriteToken(T_ID, "1.2.3.4");

    expect(first.writeToken).not.toBe(second.writeToken);
  });
});