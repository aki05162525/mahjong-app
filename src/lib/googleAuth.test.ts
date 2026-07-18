import { describe, expect, it } from "vitest";
import { generateGoogleNonce } from "./googleAuth";

describe("generateGoogleNonce", () => {
  it("Supabase用nonceとGoogle用SHA-256ハッシュを生成する", async () => {
    const { nonce, hashedNonce } = await generateGoogleNonce();
    const expectedHash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce))),
      (byte) => byte.toString(16).padStart(2, "0")
    ).join("");

    expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(hashedNonce).toBe(expectedHash);
    expect(hashedNonce).toMatch(/^[a-f0-9]{64}$/);
  });

  it("呼び出すたびに異なるnonceを生成する", async () => {
    const first = await generateGoogleNonce();
    const second = await generateGoogleNonce();

    expect(first.nonce).not.toBe(second.nonce);
  });
});
