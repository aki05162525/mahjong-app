import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { conflict, internalError, notFound } from "@/server/http/errors";
import type { UpdateTableInput } from "@/server/validation/table";

export async function updateTable(input: UpdateTableInput): Promise<{ ok: true }> {
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

  const { error } = await supabase
    .from("tables")
    .update({ name: input.name })
    .eq("id", input.tableId);
  if (error?.code === "23505") throw conflict("同じ名前の卓が既に存在します");
  if (error) throw internalError("変更に失敗しました");
  return { ok: true };
}
