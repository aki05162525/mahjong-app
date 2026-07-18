import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { internalError } from "@/server/http/errors";
import type { DeleteTournamentInput } from "@/server/validation/tournament";

export async function deleteTournament(input: DeleteTournamentInput): Promise<{ ok: true }> {
  await requireTournamentOwner(input.tournamentId);
  const { error } = await getSupabaseAdmin()
    .from("tournaments")
    .delete()
    .eq("id", input.tournamentId);
  if (error) throw internalError("大会の削除に失敗しました");
  return { ok: true };
}
