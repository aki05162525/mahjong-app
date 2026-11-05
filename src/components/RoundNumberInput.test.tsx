import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Match, Player } from "@/lib/types";
import RoundNumberInput from "./RoundNumberInput";

const players: Player[] = ["田中", "佐藤", "鈴木"].map((name, index) => ({
  id: `p${index}`,
  name,
  createdAt: new Date(),
}));
const matches: Match[] = [
  {
    id: "m1",
    tableId: "a",
    tableName: "A卓",
    roundNumber: 2,
    createdAt: new Date(),
    uma: [30, 10, -10, -30],
    returnPoints: 30000,
    results: players.slice(0, 2).map((player) => ({
      playerId: player.id,
      playerName: player.name,
      score: 25000,
      rank: 1,
      basePoint: 0,
      umaPoint: 0,
      okaPoint: 0,
      totalPoint: 0,
    })),
  },
];

const render = (value: string, selectedIds: string[]) =>
  renderToStaticMarkup(
    <RoundNumberInput
      value={value}
      onChange={() => {}}
      matches={matches}
      players={players}
      selectedIds={selectedIds}
    />
  );

describe("RoundNumberInput", () => {
  it("選択中かつその回戦に出場済みの人だけを注意表示する", () => {
    const html = render("2", ["p0", "p2"]);
    expect(html).toContain("田中は第2回戦に登録済みです");
    expect(html).not.toContain("佐藤");
    expect(html).not.toContain("鈴木");
    expect(html).toContain("このまま保存することもできます");
    expect(html).not.toContain("disabled");
    expect(html).toContain('role="status"');
  });

  it("回戦を変更すると別回戦の出場済み注意は表示しない", () => {
    expect(render("3", ["p0"])).not.toContain("登録済みです");
  });

  it("出場済みの人を未選択なら注意を表示しない", () => {
    expect(render("2", [])).not.toContain("登録済みです");
  });

  it("過去回戦と飛び番を入力できる数値欄を表示する", () => {
    const html = render("9", []);
    expect(html).toContain('type="number"');
    expect(html).toContain('value="9"');
    expect(html).toContain('min="1"');
    expect(html).toContain('step="1"');
    expect(html).toContain("過去の回戦や飛び番にも変更できます");
  });
});
