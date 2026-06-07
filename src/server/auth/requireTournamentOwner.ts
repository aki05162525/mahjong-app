import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { forbidden, notFound, internalError } from "@/server/http/errors";
import { requireUser } from "./requireUser";

export async function requireTournamentOwner(tournamentId: string, preloadedUser?: User) {
  const user = preloadedUser ?? (await requireUser());
  const { data: tournament, error } = await getSupabaseAdmin()
    .from("tournaments")
    .select("owner_id")
    .eq("id", tournamentId)
    .single();
  if (error && error.code !== "PGRST116") throw internalError("内部エラー");
  if (!tournament) throw notFound("大会が見つかりません");
  if (tournament.owner_id !== user.id) throw forbidden();
  return user;
}
