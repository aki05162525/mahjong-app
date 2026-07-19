import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { conflict, internalError, notFound } from "@/server/http/errors";
import type { DeletePlayerInput } from "@/server/validation/player";

export async function deletePlayer(input: DeletePlayerInput): Promise<{ ok: true }> {
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

  // 対局結果に使われているかは事前SELECTでなくFK違反(23503)で判定する。
  // 事前チェックだと、チェックと削除の間に対局が登録される競合を防げない。
  const { error } = await supabase.from("players").delete().eq("id", input.playerId);
  if (error?.code === "23503") {
    throw conflict(
      "対局結果に記録されているプレイヤーは削除できません。先にそのプレイヤーの対局結果を削除してください"
    );
  }
  if (error) throw internalError("削除に失敗しました");
  return { ok: true };
}
