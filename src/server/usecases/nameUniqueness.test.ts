import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthUser = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-server", () => ({ getAuthUser: mockGetAuthUser }));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { createPlayer } from "./createPlayer";
import { createTable } from "./createTable";
import { updatePlayer } from "./updatePlayer";
import { updateTable } from "./updateTable";

function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "eq", "single"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const owner = () => makeChain({ data: { owner_id: "owner-1" }, error: null });
const duplicate = () => makeChain({ data: null, error: { code: "23505" } });

describe("大会内名称の一意制約", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetAuthUser.mockReset();
    mockGetAuthUser.mockResolvedValue({ id: "owner-1" });
  });

  it("プレイヤー作成の23505をconflictへ変換する", async () => {
    mockFrom.mockReturnValueOnce(owner()).mockReturnValueOnce(duplicate());
    await expect(createPlayer({ tournamentId: "t1", name: "Alice" })).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("卓作成の23505をconflictへ変換する", async () => {
    mockFrom.mockReturnValueOnce(owner()).mockReturnValueOnce(duplicate());
    await expect(createTable({ tournamentId: "t1", name: "A卓" })).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("プレイヤー更新の23505をconflictへ変換する", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(owner())
      .mockReturnValueOnce(duplicate());
    await expect(updatePlayer({ playerId: "p1", name: "Alice" })).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("卓更新の23505をconflictへ変換する", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { tournament_id: "t1" }, error: null }))
      .mockReturnValueOnce(owner())
      .mockReturnValueOnce(duplicate());
    await expect(updateTable({ tableId: "table-1", name: "A卓" })).rejects.toMatchObject({
      code: "conflict",
    });
  });
});
