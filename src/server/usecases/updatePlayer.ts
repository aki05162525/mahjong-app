import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { conflict, internalError, notFound } from "@/server/http/errors";
import type { UpdatePlayerInput } from "@/server/validation/player";

export async function updatePlayer(input: UpdatePlayerInput): Promise<{ ok: true }> {
  const user = await requireUser();
  const supabase = getSupabaseAdmin();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("tournament_id")
    .eq("id", input.playerId)
    .single();

  if (playerError && playerError.code !== "PGRST116") throw internalError();
  if (!player) throw notFound("プレイヤーが見つかりません");

  await requireTournamentOwner(player.tournament_id, user);

  const { count, error: countError } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", player.tournament_id)
    .eq("name", input.name)
    .neq("id", input.playerId);

  if (countError) throw internalError("プレイヤーの確認に失敗しました");
  if (count && count > 0) throw conflict("同じ名前のプレイヤーが既に存在します");

  const { error } = await supabase
    .from("players")
    .update({ name: input.name })
    .eq("id", input.playerId);
  if (error) throw internalError("変更に失敗しました");
  return { ok: true };
}
