import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { internalError, notFound } from "@/server/http/errors";
import type { DeleteMatchInput } from "@/server/validation/match";

export async function deleteMatch(input: DeleteMatchInput): Promise<{ ok: true }> {
  const user = await requireUser();
  const supabase = getSupabaseAdmin();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("tournament_id")
    .eq("id", input.matchId)
    .single();

  if (matchError && matchError.code !== "PGRST116") throw internalError();
  if (!match) throw notFound("対局が見つかりません");

  await requireTournamentOwner(match.tournament_id, user);

  const { error } = await supabase.rpc("delete_match_and_renumber", {
    p_match_id: input.matchId,
    p_tournament_id: match.tournament_id,
  });
  if (error) throw internalError("削除に失敗しました");
  return { ok: true };
}
