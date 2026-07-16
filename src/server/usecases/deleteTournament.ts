import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { internalError, rateLimited } from "@/server/http/errors";
import type { DeleteTournamentInput } from "@/server/validation/tournament";

export async function deleteTournament(
  input: DeleteTournamentInput,
  clientIp: string
): Promise<{ ok: true }> {
  if (!(await checkRateLimit(clientIp)).ok) {
    throw rateLimited("リクエストが多すぎます。しばらくしてから再試行してください");
  }

  await requireTournamentOwner(input.tournamentId);
  const { error } = await getSupabaseAdmin()
    .from("tournaments")
    .delete()
    .eq("id", input.tournamentId);
  if (error) throw internalError("大会の削除に失敗しました");
  return { ok: true };
}
