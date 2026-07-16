import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { conflict, internalError } from "@/server/http/errors";
import type { CreatePlayerInput } from "@/server/validation/player";

export async function createPlayer(input: CreatePlayerInput): Promise<{ id: string }> {
  await requireTournamentOwner(input.tournamentId);

  const supabase = getSupabaseAdmin();
  const { count, error: countError } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", input.tournamentId)
    .eq("name", input.name);

  if (countError) throw internalError("プレイヤーの確認に失敗しました");
  if (count && count > 0) throw conflict("同じ名前のプレイヤーが既に存在します");

  const { data, error } = await supabase
    .from("players")
    .insert({ tournament_id: input.tournamentId, name: input.name })
    .select("id")
    .single();

  if (error) throw internalError("登録に失敗しました");
  return { id: data.id };
}
