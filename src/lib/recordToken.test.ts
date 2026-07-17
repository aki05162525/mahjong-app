import { describe, it, expect } from "vitest";
import { parseTokenFromHash, buildRecordUrl } from "./recordToken";

describe("parseTokenFromHash", () => {
  it("#k=<token> からトークンを取り出す", () => {
    expect(parseTokenFromHash("#k=abc123_-XYZ")).toBe("abc123_-XYZ");
  });

  it("先頭の # が無くても取り出せる", () => {
    expect(parseTokenFromHash("k=abc")).toBe("abc");
  });

  it("他のパラメータが混ざっていても k だけを読む", () => {
    expect(parseTokenFromHash("#foo=1&k=abc&bar=2")).toBe("abc");
  });

  it("k が無ければ null", () => {
    expect(parseTokenFromHash("#foo=1")).toBeNull();
    expect(parseTokenFromHash("")).toBeNull();
    expect(parseTokenFromHash("#")).toBeNull();
  });

  it("k が空文字なら null", () => {
    expect(parseTokenFromHash("#k=")).toBeNull();
  });
});

describe("buildRecordUrl", () => {
  it("fragment 形式（#k=）で記録 URL を組み立てる", () => {
    expect(buildRecordUrl("https://example.com", "my-tournament", "tok_123")).toBe(
      "https://example.com/record/my-tournament#k=tok_123"
    );
  });
});
