import { describe, expect, it } from "vitest";
import { parseCreatePlayer, parseUpdatePlayer } from "./player";
import { parseCreateRule, parseUpdateRule } from "./rule";
import { parseCreateTable, parseUpdateTable } from "./table";
import { parseCreateTournament, parseDeleteTournament } from "./tournament";

async function expectBadRequest(run: () => unknown, message: string) {
  const error = (await Promise.resolve()
    .then(run)
    .catch((caught) => caught)) as { code: string; message: string };
  expect(error.code).toBe("bad_request");
  expect(error.message).toContain(message);
}

describe("player validation", () => {
  it("作成入力をトリムする", () => {
    expect(parseCreatePlayer({ tournamentId: " t1 ", name: " Alice " })).toEqual({
      tournamentId: "t1",
      name: "Alice",
    });
  });

  it("空名と長すぎる名前を拒否する", async () => {
    await expectBadRequest(() => parseCreatePlayer({ tournamentId: "t1", name: " " }), "名前");
    await expectBadRequest(() => parseUpdatePlayer("p1", { name: "a".repeat(21) }), "20文字");
  });
});

describe("table validation", () => {
  it("作成・更新入力を正規化する", () => {
    expect(parseCreateTable({ tournamentId: "t1", name: " A卓 " }).name).toBe("A卓");
    expect(parseUpdateTable("table-1", { name: " B卓 " })).toEqual({
      tableId: "table-1",
      name: "B卓",
    });
  });

  it("大会IDと卓名を必須にする", async () => {
    await expectBadRequest(() => parseCreateTable({ name: "A卓" }), "大会ID");
    await expectBadRequest(() => parseUpdateTable("table-1", { name: "" }), "卓名");
  });
});

describe("rule validation", () => {
  const validRule = {
    name: "10-30",
    uma: [30, 10, -10, -30],
    returnPoints: 30000,
  };

  it("作成時の省略はfalse、更新時の省略は変更なしとして扱う", () => {
    expect(parseCreateRule({ tournamentId: "t1", ...validRule }).isDefault).toBe(false);
    expect(parseUpdateRule("r1", validRule).isDefault).toBeUndefined();
  });

  it("ウマの合計と返し点を検証する", async () => {
    await expectBadRequest(
      () => parseCreateRule({ tournamentId: "t1", ...validRule, uma: [30, 10, -10, -20] }),
      "合計"
    );
    await expectBadRequest(
      () => parseUpdateRule("r1", { ...validRule, returnPoints: 24999 }),
      "25000"
    );
  });
});

describe("tournament validation", () => {
  it("大会名を正規化する", () => {
    expect(parseCreateTournament({ name: " 大会 " })).toEqual({ name: "大会" });
  });

  it("空の削除IDを拒否する", async () => {
    await expectBadRequest(() => parseDeleteTournament({ tournamentId: "" }), "大会ID");
  });

  it("ウィザード入力（選手・ルール選択）を受け付ける", () => {
    const parsed = parseCreateTournament({
      name: "大会",
      players: [" A ", "B"],
      rule: { type: "preset", name: "Mリーグルール" },
    });
    expect(parsed.players).toEqual(["A", "B"]);
    expect(parsed.rule).toEqual({ type: "preset", name: "Mリーグルール" });

    const custom = parseCreateTournament({
      name: "大会",
      rule: { type: "custom", name: "特別ルール", uma: [30, 10, -10, -30], returnPoints: 30000 },
    });
    expect(custom.rule).toMatchObject({ type: "custom", name: "特別ルール" });
  });

  it("選手名の重複・存在しないプリセット・不正なカスタムルールを拒否する", async () => {
    await expectBadRequest(
      () => parseCreateTournament({ name: "大会", players: ["A", " A "] }),
      "重複"
    );
    await expectBadRequest(
      () => parseCreateTournament({ name: "大会", rule: { type: "preset", name: "未知" } }),
      "プリセット"
    );
    await expectBadRequest(
      () =>
        parseCreateTournament({
          name: "大会",
          rule: { type: "custom", name: "x", uma: [1, 0, 0, 0], returnPoints: 30000 },
        }),
      "合計"
    );
  });
});
