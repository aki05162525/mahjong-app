import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Match, Player, Rule } from "@/lib/types";

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, dirty: false }));
vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useMemo: (compute: () => unknown) => compute(),
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) {
      state.values[index] = typeof initial === "function" ? initial() : initial;
    }
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
vi.mock("@/hooks/useEnterAdvance", () => ({
  useEnterAdvance: () => ({
    inputRefs: { current: [] },
    endRef: { current: null },
    advanceFrom: vi.fn(),
    hintFor: () => "next",
  }),
}));
vi.mock("@/hooks/useDragReorder", () => ({
  useDragReorder: () => ({
    listRef: { current: null },
    styleFor: () => ({}),
    handleProps: () => ({}),
    draggingIndex: null,
  }),
}));

import MatchForm from "./MatchForm";
import MatchFormFour from "./MatchFormFour";
import RoundNumberInput from "./RoundNumberInput";

type Element = ReactElement<Record<string, unknown>>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
const find = (tree: Element, type: Element["type"]) =>
  elements(tree).filter((e) => e.type === type);
const roundInput = (tree: Element) => find(tree, RoundNumberInput)[0];
function change(tree: Element, element: Element, value: string) {
  (tree.props.onChangeCapture as () => void)();
  if (element.type === RoundNumberInput) {
    (element.props.onChange as (value: string) => void)(value);
  } else {
    (element.props.onChange as (event: { target: { value: string } }) => void)({
      target: { value },
    });
  }
}
const save = (tree: Element) => (find(tree, "button")[0].props.onClick as () => Promise<void>)();

const players: Player[] = ["田中", "佐藤", "鈴木", "山田"].map((name, index) => ({
  id: `p${index}`,
  name,
  createdAt: new Date(),
}));
const rules: Rule[] = [
  {
    id: "rule",
    name: "標準",
    uma: [30, 10, -10, -30],
    returnPoints: 30000,
    isDefault: true,
    createdAt: new Date(),
  },
];
const matches: Match[] = [
  {
    id: "existing",
    tableId: null,
    tableName: "",
    roundNumber: 1,
    createdAt: new Date(),
    uma: [30, 10, -10, -30],
    returnPoints: 30000,
    results: players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      score: 25000,
      rank: 1,
      basePoint: 0,
      umaPoint: 0,
      okaPoint: 0,
      totalPoint: 0,
    })),
  },
];

function render(four: boolean): Element {
  for (let attempt = 0; attempt < 10; attempt++) {
    state.cursor = 0;
    state.dirty = false;
    const props = { tournamentId: "t", players, rules, matches };
    const tree = four ? MatchFormFour(props) : MatchForm({ ...props, tables: [], matchCounts: {} });
    if (!state.dirty) return tree as Element;
  }
  throw new Error("フォーム state の再レンダーが収束しません");
}

const fetchMock = vi.fn();
beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.dirty = false;
  vi.useFakeTimers();
  fetchMock.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each([false, true])("対局フォーム（4人専用=%s）", (four) => {
  function fill() {
    let tree = render(four);
    change(tree, roundInput(tree), "1");
    tree = render(four);
    if (!four) {
      for (let i = 0; i < 4; i++) {
        const select = find(tree, "select")[i + 1];
        // 同じ回戦に登録済みでもプレイヤーを選択できる。
        expect(find(select, "option").some((option) => option.props.value === players[i].id)).toBe(
          true
        );
        change(tree, select, players[i].id);
        tree = render(four);
      }
    }
    for (let i = 0; i < 3; i++) {
      change(tree, find(tree, "input")[i], "250");
      tree = render(four);
    }
    return tree;
  }

  it("同じ回戦への再出場を注意表示の対象にしつつ保存できる", async () => {
    const tree = fill();
    expect(roundInput(tree).props.selectedIds).toEqual(players.map((p) => p.id));
    expect(tree.props.disabled).toBe(false);
    await save(tree);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      roundNumber: 1,
      inputs: players.map((p) => ({ playerId: p.id, score: 25000 })),
    });
    expect(roundInput(render(four)).props.value).toBe("2");
  });

  it("無効な回戦を保存せず、手動入力値を保持する", async () => {
    const tree = fill();
    change(tree, roundInput(tree), "0");
    await save(render(four));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(roundInput(render(four)).props.value).toBe("0");
  });

  it("保存に失敗しても回戦と入力済み点数を保持する", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "保存失敗" }) });
    await save(fill());
    const tree = render(four);
    expect(roundInput(tree).props.value).toBe("1");
    expect(find(tree, "input").map((input) => input.props.value)).toEqual([
      "250",
      "250",
      "250",
      "250",
    ]);
  });
});
