import { describe, it, expect } from "vitest";
import { toActualScore, autoFillSlot, previewPoints } from "./matchInput";

describe("toActualScore", () => {
  it("百点単位を実点に変換する", () => {
    expect(toActualScore("250")).toBe(25000);
    expect(toActualScore("-12")).toBe(-1200);
  });
});

describe("autoFillSlot", () => {
  it("空き1枠を合計100,000点になるよう埋める（北以外でも）", () => {
    // 東・西・北が埋まり、南が空 → 南を計算
    expect(autoFillSlot(["300", "", "250", "200"])).toEqual({ index: 1, value: "250" });
  });

  it("末尾が空のときも埋める", () => {
    expect(autoFillSlot(["300", "250", "250", ""])).toEqual({ index: 3, value: "200" });
  });

  it("空きが2枠以上なら計算しない", () => {
    expect(autoFillSlot(["300", "", "", "200"])).toBeNull();
  });

  it("空きが0枠なら計算しない（全手入力を尊重）", () => {
    expect(autoFillSlot(["300", "250", "250", "200"])).toBeNull();
  });

  it("埋まっている枠に数値以外があれば計算しない", () => {
    expect(autoFillSlot(["300", "abc", "250", ""])).toBeNull();
  });

  it("マイナスを含む空き枠も計算できる", () => {
    // 600 + 500 + 0 = 110,000 → 残りは -10,000点 = "-100"
    expect(autoFillSlot(["600", "500", "0", ""])).toEqual({ index: 3, value: "-100" });
  });
});

describe("previewPoints", () => {
  const rule = { uma: [30, 10, -10, -30], returnPoints: 25000 };

  it("合計100,000点ならウマ・オカ込みのポイントを返す", () => {
    const pts = previewPoints(["300", "250", "250", "200"], rule);
    expect(pts).not.toBeNull();
    // 返し点=持ち点なのでオカ0。素点±ウマの合計は0になる。
    expect(pts!.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
    expect(pts![0]).toBeGreaterThan(pts![3]);
  });

  it("合計が100,000点でなければ null", () => {
    expect(previewPoints(["300", "250", "250", "250"], rule)).toBeNull();
  });

  it("空欄があれば null", () => {
    expect(previewPoints(["300", "250", "250", ""], rule)).toBeNull();
  });

  it("ルール未指定なら null", () => {
    expect(previewPoints(["300", "250", "250", "200"], undefined)).toBeNull();
  });
});
