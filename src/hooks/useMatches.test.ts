import { describe, it, expect, vi, beforeEach } from "vitest";

// useEffect を同期実行してサブスクリプション設定を検査できるようにする
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: (fn: () => (() => void) | void) => {
      fn();
    },
    useState: <T>(initial: T) => [initial, vi.fn()] as [T, ReturnType<typeof vi.fn>],
  };
});

vi.mock("@/lib/debounce", () => ({
  debounce: (fn: unknown) => Object.assign(fn as object, { cancel: vi.fn() }),
}));

vi.mock("@/lib/ranking", () => ({
  buildRanking: vi.fn().mockReturnValue([]),
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

describe("useMatches — Realtime subscription", () => {
  beforeEach(() => {
    mockOn.mockReset();
    mockSubscribe.mockReset();
    mockChannel.mockReset();

    // channel().on(...).on(...).subscribe() チェーンをセットアップ
    mockOn.mockReturnThis();
    mockSubscribe.mockReturnThis();
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

    // from().select().eq().order().then() チェーンをセットアップ（fetchMatches 用）
    const fromChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };
    mockFrom.mockReturnValue(fromChain);
  });

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
