import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { proxy } from "./proxy";

describe("proxy", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("公開の対局保存APIではAuthサーバーへ問い合わせない", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/api/matches", { method: "POST" })
    );

    expect(response.status).toBe(200);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("認証を使う通常の経路ではセッションを更新する", async () => {
    await proxy(new NextRequest("http://localhost/"));

    expect(mockGetUser).toHaveBeenCalledOnce();
  });
});
