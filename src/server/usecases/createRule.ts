import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { internalError } from "@/server/http/errors";
import type { CreateRuleInput } from "@/server/validation/rule";

export async function createRule(input: CreateRuleInput): Promise<{ id: string }> {
  await requireTournamentOwner(input.tournamentId);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("create_rule_atomic", {
    p_tournament_id: input.tournamentId,
    p_name: input.name,
    p_uma: input.uma,
    p_return_points: input.returnPoints,
    p_is_default: input.isDefault,
  });

  if (error || !data) throw internalError("ルールの作成に失敗しました");
  return { id: data };
}
