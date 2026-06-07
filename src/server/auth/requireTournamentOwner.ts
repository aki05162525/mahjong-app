import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { forbidden, notFound } from "@/server/http/errors";
import { requireUser } from "./requireUser";

export async function requireTournamentOwner(tournamentId: string) {
  const user = await requireUser();
  const { data: tournament } = await getSupabaseAdmin()
    .from("tournaments")
    .select("owner_id")
    .eq("id", tournamentId)
    .single();
  if (!tournament) throw notFound("大会が見つかりません");
  if (tournament.owner_id !== user.id) throw forbidden();
  return user;
}
