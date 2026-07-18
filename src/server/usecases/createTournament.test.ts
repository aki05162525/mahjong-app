import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth/requireUser", () => ({ requireUser: mockRequireUser }));

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/infra/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { createTournament } from "./createTournament";
import { SEED_RULES } from "@/lib/seedRules";

const T_ID = "tournament-1";

// insert / delete で終わるチェーン。insert に渡された行をアサートできるよう vi.fn を公開する
function makeChain(result: object) {
  const chain: Record<string, unknown> = {};
  for (const method of ["insert", "select", "single", "delete", "eq"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain as {
    insert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
  };
}

const tournamentCreated = () => makeChain({ data: { id: T_ID }, error: null });
const ok = () => makeChain({ error: null });
const failed = () => makeChain({ data: null, error: { code: "XX000" } });

describe("createTournament", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRequireUser.mockReset().mockResolvedValue({ id: "owner-1" });
  });

  it("rule未指定ならseedのデフォルトをそのまま使う", async () => {
    const rules = ok();
    mockFrom.mockReturnValueOnce(tournamentCreated()).mockReturnValueOnce(rules);

    const result = await createTournament({ name: "大会" });
    expect(result).toEqual({ id: T_ID });
    expect(rules.insert).toHaveBeenCalledWith(
      SEED_RULES.map((rule) =>
        expect.objectContaining({ name: rule.name, is_default: rule.isDefault })
      )
    );
  });

  it("プリセット指定でそのseedルールだけがデフォルトになり、選手を一括登録する", async () => {
    const rules = ok();
    const players = ok();
    mockFrom
      .mockReturnValueOnce(tournamentCreated())
      .mockReturnValueOnce(rules)
      .mockReturnValueOnce(players);

    await createTournament({
      name: "大会",
      players: ["A", "B", "C"],
      rule: { type: "preset", name: "Mリーグルール" },
    });

    const rows = rules.insert.mock.calls[0][0] as { name: string; is_default: boolean }[];
    expect(rows.filter((row) => row.is_default).map((row) => row.name)).toEqual(["Mリーグルール"]);
    expect(players.insert).toHaveBeenCalledWith([
      { tournament_id: T_ID, name: "A" },
      { tournament_id: T_ID, name: "B" },
      { tournament_id: T_ID, name: "C" },
    ]);
  });

  it("カスタムルールはseedに追加され、それだけがデフォルトになる", async () => {
    const rules = ok();
    mockFrom.mockReturnValueOnce(tournamentCreated()).mockReturnValueOnce(rules);

    await createTournament({
      name: "大会",
      rule: { type: "custom", name: "特別", uma: [15, 5, -5, -15], returnPoints: 25000 },
    });

    const rows = rules.insert.mock.calls[0][0] as { name: string; is_default: boolean }[];
    expect(rows).toHaveLength(SEED_RULES.length + 1);
    expect(rows.filter((row) => row.is_default).map((row) => row.name)).toEqual(["特別"]);
  });

  it("選手の登録に失敗したら大会を削除してエラーにする", async () => {
    const deleteChain = ok();
    mockFrom
      .mockReturnValueOnce(tournamentCreated())
      .mockReturnValueOnce(ok()) // rules
      .mockReturnValueOnce(failed()) // players
      .mockReturnValueOnce(deleteChain); // rollback delete

    await expect(createTournament({ name: "大会", players: ["A"] })).rejects.toMatchObject({
      code: "internal_error",
    });
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith("id", T_ID);
  });
});
