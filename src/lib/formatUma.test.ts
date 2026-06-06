import { describe, expect, it } from "vitest";
import { formatUma } from "./formatUma";

describe("formatUma", () => {
  it("対称なウマは「2位-1位」の慣用表記にする", () => {
    expect(formatUma([30, 10, -10, -30])).toBe("10-30");
    expect(formatUma([20, 10, -10, -20])).toBe("10-20");
    expect(formatUma([10, 5, -5, -10])).toBe("5-10");
    expect(formatUma([0, 0, 0, 0])).toBe("0-0");
  });

  it("非対称なウマは全要素を並べた表記にフォールバックする", () => {
    expect(formatUma([40, 0, -10, -30])).toBe("40/0/-10/-30");
  });
});
