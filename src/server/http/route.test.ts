import { describe, it, expect } from "vitest";
import { route } from "./route";
import { badRequest, unauthorized } from "./errors";

describe("route", () => {
  it("正常値を NextResponse.json で返す", async () => {
    const response = await route(async () => ({ ok: true, data: "test" }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ ok: true, data: "test" });
  });

  it("AppError を throw したとき正しい status でエラーレスポンスを返す", async () => {
    const response = await route(async () => {
      throw badRequest("スコアが不正です", { total: 99000 });
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({
      error: "スコアが不正です",
      code: "bad_request",
      details: { total: 99000 },
    });
  });

  it("unauthorized を throw したとき 401 を返す", async () => {
    const response = await route(async () => {
      throw unauthorized();
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({
      error: "ログインが必要です",
      code: "unauthorized",
      details: null,
    });
  });

  it("予期しない例外が起きたとき 500 でエラーレスポンスを返す", async () => {
    const response = await route(async () => {
      throw new Error("予期しないエラー");
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toEqual({
      error: "内部エラー",
      code: "internal_error",
    });
  });

  // Note: unstable_rethrow のテストは Next.js 内部の挙動に依存するため省略
  // redirect() / notFound() が投げるエラーは unstable_rethrow で再throw され、
  // Next.js が適切に処理することを前提としています
});
