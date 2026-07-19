import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { conflict, internalError, notFound } from "@/server/http/errors";
import type { DeleteTableInput } from "@/server/validation/table";

export async function deleteTable(input: DeleteTableInput): Promise<{ ok: true }> {
  const user = await requireUser();
  const supabase = getSupabaseAdmin();
  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("tournament_id")
    .eq("id", input.tableId)
    .single();

  if (tableError && tableError.code !== "PGRST116") throw internalError();
  if (!table) throw notFound("卓が見つかりません");

  await requireTournamentOwner(table.tournament_id, user);

  // 対局に使われているかは事前SELECTでなくFK違反(23503)で判定する。
  // 事前チェックだと、チェックと削除の間に対局が登録される競合を防げない。
  const { error } = await supabase.from("tables").delete().eq("id", input.tableId);
  if (error?.code === "23503") {
    throw conflict(
      "対局結果に記録されている卓は削除できません。先にその卓の対局結果を削除してください"
    );
  }
  if (error) throw internalError("削除に失敗しました");
  return { ok: true };
}
