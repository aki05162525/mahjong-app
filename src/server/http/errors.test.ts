import { describe, it, expect } from "vitest";
import { badRequest, unauthorized, forbidden, notFound, conflict, internalError } from "./errors";

describe("AppError", () => {
  it("badRequest は status 400 と code 'bad_request' を持つ", () => {
    const error = badRequest("テストメッセージ");
    expect(error.status).toBe(400);
    expect(error.code).toBe("bad_request");
    expect(error.message).toBe("テストメッセージ");
  });

  it("unauthorized は status 401 と code 'unauthorized' を持つ", () => {
    const error = unauthorized("トークンが無効です");
    expect(error.status).toBe(401);
    expect(error.code).toBe("unauthorized");
    expect(error.message).toBe("トークンが無効です");
  });

  it("unauthorized はデフォルトメッセージを持つ", () => {
    const error = unauthorized();
    expect(error.message).toBe("ログインが必要です");
  });

  it("forbidden は status 403 と code 'forbidden' を持つ", () => {
    const error = forbidden("アクセス権限がありません");
    expect(error.status).toBe(403);
    expect(error.code).toBe("forbidden");
    expect(error.message).toBe("アクセス権限がありません");
  });

  it("notFound は status 404 と code 'not_found' を持つ", () => {
    const error = notFound("リソースが見つかりません");
    expect(error.status).toBe(404);
    expect(error.code).toBe("not_found");
    expect(error.message).toBe("リソースが見つかりません");
  });

  it("conflict は status 409 と code 'conflict' を持つ", () => {
    const error = conflict("既に存在します");
    expect(error.status).toBe(409);
    expect(error.code).toBe("conflict");
    expect(error.message).toBe("既に存在します");
  });

  it("internalError は status 500 と code 'internal_error' を持つ", () => {
    const error = internalError();
    expect(error.status).toBe(500);
    expect(error.code).toBe("internal_error");
    expect(error.message).toBe("内部エラー");
  });

  it("details を渡すと AppError.details に保存される", () => {
    const error = badRequest("スコアが不正です", { total: 99000 });
    expect(error.details).toEqual({ total: 99000 });
  });
});
