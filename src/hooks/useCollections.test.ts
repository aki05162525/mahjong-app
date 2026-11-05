import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setState: vi.fn(),
  effects: [] as Array<() => (() => void) | void>,
  from: vi.fn(),
  on: vi.fn(),
  removeChannel: vi.fn(),
}));

// 既存の useMatches テストと同様、DOM を使わず取得と購読の振る舞いを検査する。
vi.mock("react", () => ({
  useState: <T>(initial: T) => [initial, mocks.setState],
  useCallback: <T>(callback: T) => callback,
  useEffect: (effect: () => (() => void) | void) => mocks.effects.push(effect),
}));

vi.mock("@/infra/supabase", () => ({
  supabase: {
    from: mocks.from,
    channel: () => ({ on: mocks.on, subscribe: vi.fn().mockReturnThis() }),
    removeChannel: mocks.removeChannel,
  },
}));

import { useTables } from "./useTables";
import { usePlayers } from "./usePlayers";
import { useRules } from "./useRules";

const createdAt = "2026-01-01T00:00:00Z";
const row = { id: "item-1", name: "名前", created_at: createdAt };
const mapped = { id: row.id, name: row.name, createdAt: new Date(createdAt) };

describe.each([
  { name: "useTables", useHook: useTables, table: "tables", row, mapped },
  { name: "usePlayers", useHook: usePlayers, table: "players", row, mapped },
  {
    name: "useRules",
    useHook: useRules,
    table: "rules",
    row: { ...row, uma: [20, 10, -10, -20], return_points: 30000, is_default: true },
    mapped: { ...mapped, uma: [20, 10, -10, -20], returnPoints: 30000, isDefault: true },
  },
])("$name", ({ name, useHook, table, row, mapped }) => {
  const execute = vi.fn();
  const eq = vi.fn();
  const order = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.effects.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
    execute.mockReset().mockResolvedValue({ data: [row], error: null });
    eq.mockReturnThis();
    order.mockReturnThis();
    mocks.on.mockReturnThis();
    // Supabase のクエリは Promise そのものではなく thenable。
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq,
      order,
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        execute().then(resolve, reject),
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("成功時にデータを変換し、大会と安定した並び順を維持する", async () => {
    const { refetch } = useHook("tournament-1");
    await refetch();
    expect(mocks.from).toHaveBeenCalledWith(table);
    expect(eq).toHaveBeenCalledWith("tournament_id", "tournament-1");
    expect(order.mock.calls).toEqual([["created_at"], ["id"]]);
    expect(mocks.setState).toHaveBeenLastCalledWith([mapped]);
  });

  it.each(["response", "rejection"])(
    "%s のエラーを記録し、直前のデータを保持して再取得で復旧する",
    async (kind) => {
      const { refetch } = useHook("tournament-1");
      await refetch();
      mocks.setState.mockClear();
      const error = new Error("network or authorization failure");
      if (kind === "response") execute.mockResolvedValueOnce({ data: null, error });
      else execute.mockRejectedValueOnce(error);

      await expect(refetch()).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(`[${name}] Failed to fetch ${table}`, error);
      expect(mocks.setState).not.toHaveBeenCalled();

      execute.mockResolvedValueOnce({ data: [], error: null });
      await refetch();
      expect(mocks.setState).toHaveBeenCalledWith([]);
    }
  );

  it("初回取得と Realtime 再取得の失敗も捕捉し、購読を解除できる", async () => {
    const error = { code: "42501", message: "permission denied" };
    execute.mockResolvedValueOnce({ data: null, error });
    useHook("tournament-1");
    const cleanup = mocks.effects[0]();
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledTimes(1));
    expect(mocks.setState).not.toHaveBeenCalled();
    expect(mocks.on.mock.calls[0][1]).toMatchObject({
      table,
      filter: "tournament_id=eq.tournament-1",
    });

    execute.mockRejectedValueOnce(new Error("offline"));
    await expect(mocks.on.mock.calls[0][2]()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(mocks.setState).not.toHaveBeenCalled();
    cleanup?.();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
  });
});
