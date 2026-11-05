import { describe, expect, it } from "vitest";
import { MATCH_SELECT, toMatch, type SupabaseMatch } from "./matchesQuery";

describe("対局の卓ID取得", () => {
  it("通常の取得でも卓IDを要求する", () => {
    expect(MATCH_SELECT).toMatch(/\btable_id\s*,/);
  });

  it.each(["table-a", null])("卓ID %j を回戦候補の計算用に保持する", (tableId) => {
    const row: SupabaseMatch = {
      id: "match-1",
      round_number: 3,
      table_id: tableId,
      created_at: "2026-11-05T00:00:00Z",
      uma: [30, 10, -10, -30],
      return_points: 30000,
      "tables!matches_table_id_fkey": tableId ? { name: "A卓" } : null,
      match_results: [],
    };
    expect(toMatch(row)).toMatchObject({
      roundNumber: 3,
      tableId,
      tableName: tableId ? "A卓" : "",
    });
  });
});
