import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCheckMatchIpLimit = vi.hoisted(() => vi.fn());
const mockConsumeTournamentWriteLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit", () => ({
  checkMatchIpLimit: mockCheckMatchIpLimit,
  consumeTournamentWriteLimit: mockConsumeTournamentWriteLimit,
}));

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({ getAuthUser: mockGetAuthUser }));

const mockVerifyWriteToken = vi.hoisted(() => vi.fn());
vi.mock("./writeToken", () => ({ verifyWriteToken: mockVerifyWriteToken }));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { authorizeMatchWrite } from "./authorizeMatchWrite";

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

const T_ID = "my-tournament";
const OWNER = { id: "00000000-0000-4000-8000-0000000000aa" };

describe("authorizeMatchWrite", () => {
  beforeEach(() => {
    mockCheckMatchIpLimit.mockReset();
    mockConsumeTournamentWriteLimit.mockReset();
    mockGetAuthUser.mockReset();
    mockVerifyWriteToken.mockReset();
    mockFrom.mockReset();

    mockCheckMatchIpLimit.mockResolvedValue({ ok: true });
    mockConsumeTournamentWriteLimit.mockResolvedValue({ ok: true });
    mockGetAuthUser.mockResolvedValue(null);
    mockVerifyWriteToken.mockResolvedValue(false);
  });

  it("IP プレフィルタが枯渇していたら rate_limited(429) を throw し、以降の処理をしない", async () => {
    mockCheckMatchIpLimit.mockResolvedValueOnce({ ok: false });

    const error = await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: null }).catch(
      (e) => e
    );

    expect(error.code).toBe("rate_limited");
    expect(error.status).toBe(429);
    expect(mockVerifyWriteToken).not.toHaveBeenCalled();
    expect(mockGetAuthUser).not.toHaveBeenCalled();
    expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
  });

  it("有効なトークンなら認可され、大会バケットを消費する", async () => {
    mockVerifyWriteToken.mockResolvedValueOnce(true);

    await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: "raw-token" });

    expect(mockVerifyWriteToken).toHaveBeenCalledWith(T_ID, "raw-token");
    expect(mockGetAuthUser).not.toHaveBeenCalled(); // トークンが有効ならオーナー確認は不要（短絡評価）
    expect(mockConsumeTournamentWriteLimit).toHaveBeenCalledWith(T_ID);
  });

  it("無効なトークンかつ未ログインなら INVALID_WRITE_TOKEN(401) を throw する", async () => {
    mockVerifyWriteToken.mockResolvedValueOnce(false);
    mockGetAuthUser.mockResolvedValueOnce(null);

    const error = await authorizeMatchWrite(T_ID, {
      clientIp: "1.2.3.4",
      writeToken: "wrong-token",
    }).catch((e) => e);

    expect(error.code).toBe("INVALID_WRITE_TOKEN");
    expect(error.status).toBe(401);
    expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
  });

  it("無効なトークンでもログイン済みオーナーなら認可される（token || owner）", async () => {
    mockVerifyWriteToken.mockResolvedValueOnce(false);
    mockGetAuthUser.mockResolvedValueOnce(OWNER);
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: { owner_id: OWNER.id } }));

    await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: "wrong-token" });

    expect(mockConsumeTournamentWriteLimit).toHaveBeenCalledWith(T_ID);
  });

  it("トークン無し・未ログインなら unauthorized(401) を throw する", async () => {
    const error = await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: null }).catch(
      (e) => e
    );

    expect(error.code).toBe("unauthorized");
    expect(error.status).toBe(401);
    expect(mockVerifyWriteToken).not.toHaveBeenCalled(); // writeToken が null なら照合しない
    expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
  });

  it("トークン無しでもログイン済みオーナーなら認可される", async () => {
    mockGetAuthUser.mockResolvedValueOnce(OWNER);
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: { owner_id: OWNER.id } }));

    await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: null });

    expect(mockConsumeTournamentWriteLimit).toHaveBeenCalledWith(T_ID);
  });

  it("トークン無し・ログイン済みだが所有者でなければ unauthorized(401) を throw する", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: "someone-else" });
    mockFrom.mockReturnValueOnce(makeTournamentChain({ data: { owner_id: OWNER.id } }));

    const error = await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: null }).catch(
      (e) => e
    );

    expect(error.code).toBe("unauthorized");
    expect(mockConsumeTournamentWriteLimit).not.toHaveBeenCalled();
  });

  it("オーナー確認で PGRST116 以外の DB エラーが出たら internalError(500) を throw する", async () => {
    mockGetAuthUser.mockResolvedValueOnce(OWNER);
    mockFrom.mockReturnValueOnce(
      makeTournamentChain({ data: null, error: { code: "PGRST301" } })
    );

    const error = await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: null }).catch(
      (e) => e
    );

    expect(error.code).toBe("internal_error");
    expect(error.status).toBe(500);
  });

  it("検証を通過しても大会バケットが枯渇していたら rate_limited(429) を throw する", async () => {
    mockVerifyWriteToken.mockResolvedValueOnce(true);
    mockConsumeTournamentWriteLimit.mockResolvedValueOnce({ ok: false });

    const error = await authorizeMatchWrite(T_ID, {
      clientIp: "1.2.3.4",
      writeToken: "raw-token",
    }).catch((e) => e);

    expect(error.code).toBe("rate_limited");
    expect(error.status).toBe(429);
  });

  it("呼び出し順序は IP プレフィルタ → 検証 → 大会バケット消費で固定されている", async () => {
    const callOrder: string[] = [];
    mockCheckMatchIpLimit.mockImplementationOnce(async () => {
      callOrder.push("ip");
      return { ok: true };
    });
    mockVerifyWriteToken.mockImplementationOnce(async () => {
      callOrder.push("verify");
      return true;
    });
    mockConsumeTournamentWriteLimit.mockImplementationOnce(async () => {
      callOrder.push("bucket");
      return { ok: true };
    });

    await authorizeMatchWrite(T_ID, { clientIp: "1.2.3.4", writeToken: "raw-token" });

    expect(callOrder).toEqual(["ip", "verify", "bucket"]);
  });
});