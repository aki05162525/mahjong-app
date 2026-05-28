import { describe, it, expect, vi, beforeEach } from "vitest";

// useEffect を同期実行してサブスクリプション設定を検査できるようにする
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: (fn: () => (() => void) | void) => {
      fn();
    },
    useRef: <T>(initial: T) => ({ current: initial }),
    useState: <T>(initial: T) => [initial, vi.fn()] as [T, ReturnType<typeof vi.fn>],
  };
});

vi.mock("@/lib/debounce", () => ({
  debounce: (fn: unknown) => Object.assign(fn as object, { cancel: vi.fn() }),
}));

vi.mock("@/lib/ranking", () => ({
  buildRanking: vi.fn().mockReturnValue([]),
}));

const mockApplyMatchInsert = vi.hoisted(() => vi.fn());
const mockApplyResultInsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/matchUpdater", () => ({
  applyMatchInsert: mockApplyMatchInsert,
  applyResultInsert: mockApplyResultInsert,
}));

const mockOn = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn());
const mockChannel = vi.hoisted(() => vi.fn());
const mockRemoveChannel = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@/infra/supabase", () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

import { useMatches } from "./useMatches";

let fromChain: {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

function setupMocks(): void {
  mockOn.mockReset();
  mockSubscribe.mockReset();
  mockChannel.mockReset();
  mockApplyMatchInsert.mockReset();
  mockApplyResultInsert.mockReset();

  mockOn.mockReturnThis();
  mockSubscribe.mockReturnThis();
  mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

  fromChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  mockFrom.mockReturnValue(fromChain);
}

describe("useMatches — Realtime subscription", () => {
  beforeEach(setupMocks);

  it("match_results の subscription に tournament_id フィルタが含まれる", () => {
    useMatches("tournament-123");

    const matchResultsCalls = mockOn.mock.calls.filter(
      (args: unknown[]) => (args[1] as Record<string, unknown>).table === "match_results"
    );

    expect(matchResultsCalls).toHaveLength(1);
    expect(matchResultsCalls[0][1] as Record<string, unknown>).toHaveProperty(
      "filter",
      "tournament_id=eq.tournament-123"
    );
  });
});

describe("useMatches — キャッシュ構築", () => {
  beforeEach(setupMocks);

  it("初期化時に players と tables を別途 fetch してキャッシュを構築する", () => {
    useMatches("tournament-123");

    const fetchedTables = mockFrom.mock.calls.map((args: unknown[]) => args[0] as string);
    expect(fetchedTables).toContain("players");
    expect(fetchedTables).toContain("tables");
  });
});

describe("useMatches — matches INSERT イベントの差分更新", () => {
  beforeEach(setupMocks);

  it("matches INSERT が来たとき applyMatchInsert が非nullを返せば fetchMatches を呼ばない", () => {
    mockApplyMatchInsert.mockReturnValue([]);

    // コールバック内代入後の型絞り込みを回避するためオブジェクトで保持
    const captured: { matchInsertHandler: ((payload: { new: unknown }) => void) | null } = {
      matchInsertHandler: null,
    };
    mockOn.mockImplementation(
      (
        _event: string,
        filter: Record<string, unknown>,
        handler: (payload: { new: unknown }) => void
      ) => {
        if (filter.table === "matches" && filter.event === "INSERT")
          captured.matchInsertHandler = handler;
        return { on: mockOn, subscribe: mockSubscribe };
      }
    );

    useMatches("tournament-123");
    fromChain.then.mockClear();

    captured.matchInsertHandler?.({
      new: {
        id: "match-new",
        tournament_id: "tournament-123",
        table_id: "table-1",
        round_number: 1,
        created_at: new Date().toISOString(),
      },
    });

    // applyMatchInsert が非null → フォールバックなし → matches SELECT は呼ばれない
    expect(fromChain.then).not.toHaveBeenCalled();
  });

  it("matches INSERT が来たとき applyMatchInsert が null を返せば fetchMatches を呼ぶ（フォールバック）", () => {
    mockApplyMatchInsert.mockReturnValue(null);

    const captured: { matchInsertHandler: ((payload: { new: unknown }) => void) | null } = {
      matchInsertHandler: null,
    };
    mockOn.mockImplementation(
      (
        _event: string,
        filter: Record<string, unknown>,
        handler: (payload: { new: unknown }) => void
      ) => {
        if (filter.table === "matches" && filter.event === "INSERT")
          captured.matchInsertHandler = handler;
        return { on: mockOn, subscribe: mockSubscribe };
      }
    );

    useMatches("tournament-123");
    fromChain.then.mockClear();

    captured.matchInsertHandler?.({
      new: {
        id: "match-new",
        tournament_id: "tournament-123",
        table_id: "unknown-table",
        round_number: 1,
        created_at: new Date().toISOString(),
      },
    });

    // applyMatchInsert が null → フォールバック → matches SELECT が呼ばれる
    expect(fromChain.then).toHaveBeenCalled();
  });

  it("matches DELETE が来たとき fetchMatches を呼ぶ（削除の反映）", () => {
    const captured: { matchDeleteHandler: (() => void) | null } = { matchDeleteHandler: null };
    mockOn.mockImplementation(
      (_event: string, filter: Record<string, unknown>, handler: () => void) => {
        if (filter.table === "matches" && filter.event === "DELETE")
          captured.matchDeleteHandler = handler;
        return { on: mockOn, subscribe: mockSubscribe };
      }
    );

    useMatches("tournament-123");
    fromChain.then.mockClear();

    captured.matchDeleteHandler?.();

    // DELETE → 全件再取得
    expect(fromChain.then).toHaveBeenCalled();
  });
});
