import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
vi.mock("./requireUser", () => ({ requireUser: mockRequireUser }));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { requireTournamentOwner } from "./requireTournamentOwner";

function makeTournamentChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (r: (v: unknown) => unknown) => Promise<unknown> }).then = (
    resolve: (v: unknown) => unknown
  ) => Promise.resolve({ data: result.data, error: result.error ?? null }).then(resolve);
  return chain;
}

describe("requireTournamentOwner", () => {
  beforeEach(() => {
    mockRequireUser.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-1" });
  });

  it("大会が存在しない場合 notFound(404) を throw する", async () => {
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: null, error: { code: "PGRST116" } }));

    const error = await requireTournamentOwner("t1").catch((e) => e);
    expect(error.code).toBe("not_found");
    expect(error.status).toBe(404);
  });

  it("PGRST116 以外の DB エラーは internalError(500) を throw する", async () => {
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: null, error: { code: "PGRST301" } }));

    const error = await requireTournamentOwner("t1").catch((e) => e);
    expect(error.code).toBe("internal_error");
    expect(error.status).toBe(500);
  });

  it("オーナーが異なる場合 forbidden(403) を throw する", async () => {
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: { owner_id: "other-user" } }));

    const error = await requireTournamentOwner("t1").catch((e) => e);
    expect(error.code).toBe("forbidden");
    expect(error.status).toBe(403);
  });

  it("オーナーが一致する場合 user を返す", async () => {
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: { owner_id: "user-1" } }));

    const user = await requireTournamentOwner("t1");
    expect(user).toEqual({ id: "user-1" });
  });

  it("preloadedUser を渡すと requireUser を呼ばない", async () => {
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: { owner_id: "user-2" } }));
    const preloadedUser = { id: "user-2" } as Parameters<typeof requireTournamentOwner>[1];

    await requireTournamentOwner("t1", preloadedUser);
    expect(mockRequireUser).not.toHaveBeenCalled();
  });
});
