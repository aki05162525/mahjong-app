import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { generateWriteToken, hashWriteToken, verifyWriteToken } from "./writeToken";

function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (r: (v: unknown) => unknown) => Promise<unknown> }).then = (
    resolve: (v: unknown) => unknown
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

describe("generateWriteToken / hashWriteToken", () => {
  it("raw は 32 バイトの base64url、hash はその sha256 hex", () => {
    const { raw, hash } = generateWriteToken();
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes → base64url 43 文字（パディング無し）
    expect(hash).toBe(createHash("sha256").update(raw).digest("hex"));
  });

  it("毎回異なるトークンを生成する", () => {
    expect(generateWriteToken().raw).not.toBe(generateWriteToken().raw);
  });

  it("hashWriteToken は決定的", () => {
    expect(hashWriteToken("abc")).toBe(hashWriteToken("abc"));
  });
});

describe("verifyWriteToken", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("保存済みハッシュと一致する raw なら true", async () => {
    const { raw, hash } = generateWriteToken();
    mockFrom.mockReturnValueOnce(makeChain({ data: { token_hash: hash }, error: null }));
    await expect(verifyWriteToken("t1", raw)).resolves.toBe(true);
  });

  it("一致しない raw なら false", async () => {
    const { hash } = generateWriteToken();
    mockFrom.mockReturnValueOnce(makeChain({ data: { token_hash: hash }, error: null }));
    await expect(verifyWriteToken("t1", "wrong-token")).resolves.toBe(false);
  });

  it("シークレット未登録の大会なら false", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "PGRST116" } }));
    await expect(verifyWriteToken("t1", "any-token")).resolves.toBe(false);
  });

  it("保存済みハッシュが不正な形式でも false（例外にしない）", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: { token_hash: "broken" }, error: null }));
    await expect(verifyWriteToken("t1", "any-token")).resolves.toBe(false);
  });
});
