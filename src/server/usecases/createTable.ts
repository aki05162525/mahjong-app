import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { conflict, internalError } from "@/server/http/errors";
import type { CreateTableInput } from "@/server/validation/table";

export async function createTable(input: CreateTableInput): Promise<{ id: string }> {
  await requireTournamentOwner(input.tournamentId);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tables")
    .insert({ tournament_id: input.tournamentId, name: input.name })
    .select("id")
    .single();

  if (error?.code === "23505") throw conflict("同じ名前の卓が既に存在します");
  if (error) throw internalError("登録に失敗しました");
  return { id: data.id };
}
