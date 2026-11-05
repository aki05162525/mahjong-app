import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Match } from "@/lib/types";

// React の state と再レンダーを最小限に再現し、props 更新と入力操作の順序を検査する。
const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, dirty: false }));
vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [
      state.values[index],
      (next: unknown) => {
        const value = typeof next === "function" ? next(state.values[index]) : next;
        if (!Object.is(value, state.values[index])) state.dirty = true;
        state.values[index] = value;
      },
    ];
  },
}));

import { isValidRoundNumber, useRoundNumber } from "./useRoundNumber";

const match = (roundNumber: number, tableId: string | null = null): Match => ({
  id: `${tableId}-${roundNumber}`,
  roundNumber,
  tableId,
  tableName: tableId ?? "",
  createdAt: new Date(),
  uma: [30, 10, -10, -30],
  returnPoints: 30000,
  results: [],
});

function render(matches: Match[] = [], tableId?: string | null) {
  for (let i = 0; i < 10; i++) {
    state.cursor = 0;
    state.dirty = false;
    // このテストでは上の useState モックを使い、ループ1周を1回のレンダーとして扱う。
    // oxlint-disable-next-line react-hooks/rules-of-hooks
    const result = useRoundNumber(matches, tableId);
    if (!state.dirty) return result;
  }
  throw new Error("回戦 state の再レンダーが収束しません");
}

beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.dirty = false;
});

describe("useRoundNumber", () => {
  it("入力前は非同期で取得した既存対局に候補が追従する", () => {
    expect(render().roundNumber).toBe("1");
    expect(render([match(3)]).roundNumber).toBe("4");
  });

  it("入力を始めた後は他の対局が届いても回戦が変わらない", () => {
    render([match(3)]).pinRound();
    expect(render([match(3), match(4)]).roundNumber).toBe("4");
  });

  it("自動候補を固定していても卓を切り替えるとその卓の候補になる", () => {
    const matches = [match(3, "a"), match(1, "b")];
    render(matches, "a").pinRound();
    expect(render(matches, "b").roundNumber).toBe("2");
  });

  it("手動の回戦指定は卓の切り替えや Realtime 更新でも保持する", () => {
    render([match(3, "a")], "a").setRoundNumber("7");
    expect(render([match(8, "b")], "b").roundNumber).toBe("7");
  });

  it("保存後は Realtime の到着前でも次の回戦を提案する", () => {
    render([match(3)]).pinRound();
    render([match(3)]).advanceRound();
    expect(render([match(3)]).roundNumber).toBe("5");
    expect(render([match(3), match(4)]).roundNumber).toBe("5");
  });

  it("過去回戦を後入力しても最新回戦より前へ候補を戻さない", () => {
    render([match(5)]).setRoundNumber("2");
    render([match(5)]).advanceRound();
    expect(render([match(5)]).roundNumber).toBe("6");
  });

  it("保存直後の候補は卓ごとに保持する", () => {
    render([], "a").setRoundNumber("4");
    render([], "a").advanceRound();
    expect(render([], "b").roundNumber).toBe("1");
    expect(render([], "a").roundNumber).toBe("5");
  });

  it("空欄への手動変更を自動補完で上書きしない", () => {
    render().setRoundNumber("");
    expect(render([match(3)]).roundNumber).toBe("");
  });
});

describe("isValidRoundNumber", () => {
  it.each(["", " ", "0", "-1", "1.5", "abc", "Infinity", "2147483648"])(
    "無効な回戦 %j を拒否する",
    (value) => expect(isValidRoundNumber(value)).toBe(false)
  );

  it.each(["1", "7", "2147483647"])("正の整数 %j を許可する", (value) => {
    expect(isValidRoundNumber(value)).toBe(true);
  });
});
