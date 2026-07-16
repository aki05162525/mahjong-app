import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { internalError } from "@/server/http/errors";
import type { CreateRuleInput } from "@/server/validation/rule";

export async function createRule(input: CreateRuleInput): Promise<{ id: string }> {
  await requireTournamentOwner(input.tournamentId);
  const supabase = getSupabaseAdmin();

  if (input.isDefault) {
    const { error } = await supabase
      .from("rules")
      .update({ is_default: false })
      .eq("tournament_id", input.tournamentId)
      .eq("is_default", true);
    if (error) throw internalError("既存のデフォルトルールの更新に失敗しました");
  }

  const { data, error } = await supabase
    .from("rules")
    .insert({
      tournament_id: input.tournamentId,
      name: input.name,
      uma: input.uma,
      return_points: input.returnPoints,
      is_default: input.isDefault,
    })
    .select("id")
    .single();

  if (error) throw internalError("ルールの作成に失敗しました");
  return { id: data.id };
}
