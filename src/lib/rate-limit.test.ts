import { describe, it, expect, vi } from "vitest";

const mockLimit = vi.hoisted(() => vi.fn());

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    limit = mockLimit;
    static fixedWindow = vi.fn().mockReturnValue({});
  }
  return { Ratelimit };
});
vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn().mockReturnValue({}) },
}));

import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("Upstash が success:true を返したら ok:true", async () => {
    mockLimit.mockResolvedValue({ success: true });
    expect(await checkRateLimit("1.2.3.4")).toEqual({ ok: true });
  });

  it("Upstash が success:false を返したら ok:false", async () => {
    mockLimit.mockResolvedValue({ success: false });
    expect(await checkRateLimit("1.2.3.4")).toEqual({ ok: false });
  });

  it("IP アドレスを Upstash に渡している", async () => {
    mockLimit.mockResolvedValue({ success: true });
    await checkRateLimit("9.9.9.9");
    expect(mockLimit).toHaveBeenCalledWith("9.9.9.9");
  });
});
