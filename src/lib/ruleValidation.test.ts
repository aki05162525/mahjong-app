import { describe, it, expect } from "vitest";
import { validateRule } from "./ruleValidation";

const valid = { name: "10-30", uma: [30, 10, -10, -30], returnPoints: 30000 };

describe("validateRule", () => {
  it("正常な入力は null（エラーなし）を返す", () => {
    expect(validateRule(valid)).toBeNull();
  });

  it("名前が空のときエラー", () => {
    expect(validateRule({ ...valid, name: "  " })).toMatch(/名前/);
  });

  it("名前が30文字超のときエラー", () => {
    expect(validateRule({ ...valid, name: "あ".repeat(31) })).toMatch(/30/);
  });

  it("ウマが4要素でないときエラー", () => {
    expect(validateRule({ ...valid, uma: [30, 10, -10] })).toMatch(/ウマ/);
  });

  it("ウマに整数でない値があるときエラー", () => {
    expect(validateRule({ ...valid, uma: [30, 10, -10, -30.5] })).toMatch(/ウマ/);
  });

  it("ウマの合計が0でないときエラー", () => {
    expect(validateRule({ ...valid, uma: [30, 10, -10, -20] })).toMatch(/合計/);
  });

  it("返し点が25000未満のときエラー", () => {
    expect(validateRule({ ...valid, returnPoints: 24000 })).toMatch(/返し/);
  });

  it("返し点が整数でないときエラー", () => {
    expect(validateRule({ ...valid, returnPoints: 30000.5 })).toMatch(/返し/);
  });
});
