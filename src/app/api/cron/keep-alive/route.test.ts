import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { GET } from "./route";

function makeRequest(secret = "test-cron-secret") {
  return new Request("http://localhost/api/cron/keep-alive", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function makeQueryResult(error: { message: string } | null = null) {
  const query = {
    select: vi.fn(),
    limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [], error });
  return query;
}

describe("GET /api/cron/keep-alive", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mockFrom.mockReset();
  });

  it("500: CRON_SECRETが未設定なら実行しない", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(makeRequest());

    expect(response.status).toBe(500);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("401: Authorizationが一致しなければ実行しない", async () => {
    const response = await GET(makeRequest("wrong-secret"));

    expect(response.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("200: 軽いSELECTを3回実行する", async () => {
    const queries = [makeQueryResult(), makeQueryResult(), makeQueryResult()];
    mockFrom.mockImplementation(() => queries.shift());

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, queries: 3 });
    expect(mockFrom).toHaveBeenCalledTimes(3);
    expect(mockFrom).toHaveBeenCalledWith("tournaments");
  });

  it("500: Supabaseの問い合わせに失敗したらエラーを返す", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockFrom.mockReturnValue(makeQueryResult({ message: "database unavailable" }));

    const response = await GET(makeRequest());

    expect(response.status).toBe(500);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "Supabase keep-alive query failed",
      "database unavailable"
    );
    consoleError.mockRestore();
  });
});
