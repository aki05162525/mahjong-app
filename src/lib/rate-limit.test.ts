import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkRateLimit", () => {
  it("新規 IP の最初のリクエストは許可する", () => {
    expect(checkRateLimit("test-ip-1").ok).toBe(true);
  });

  it("同一 IP から 10 回まで許可する", () => {
    const ip = "test-ip-2";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip).ok).toBe(true);
    }
  });

  it("11 回目は拒否する", () => {
    const ip = "test-ip-3";
    for (let i = 0; i < 10; i++) checkRateLimit(ip);
    expect(checkRateLimit(ip).ok).toBe(false);
  });

  it("IP ごとに独立してカウントする", () => {
    const ip1 = "test-ip-4a";
    const ip2 = "test-ip-4b";
    for (let i = 0; i < 10; i++) checkRateLimit(ip1);
    expect(checkRateLimit(ip1).ok).toBe(false);
    expect(checkRateLimit(ip2).ok).toBe(true);
  });

  it("60 秒のウィンドウが過ぎたらカウントをリセットする", () => {
    const ip = "test-ip-5";
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    for (let i = 0; i < 10; i++) checkRateLimit(ip);
    expect(checkRateLimit(ip).ok).toBe(false);

    vi.spyOn(Date, "now").mockReturnValue(now + 61_000);
    expect(checkRateLimit(ip).ok).toBe(true);
  });
});
