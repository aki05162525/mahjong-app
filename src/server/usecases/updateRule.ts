import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { internalError, notFound } from "@/server/http/errors";
import type { UpdateRuleInput } from "@/server/validation/rule";

export async function updateRule(input: UpdateRuleInput): Promise<{ ok: true }> {
  const user = await requireUser();
  const supabase = getSupabaseAdmin();
  const { data: rule, error: ruleError } = await supabase
    .from("rules")
    .select("tournament_id")
    .eq("id", input.ruleId)
    .single();

  if (ruleError && ruleError.code !== "PGRST116") throw internalError();
  if (!rule) throw notFound("ルールが見つかりません");

  await requireTournamentOwner(rule.tournament_id, user);

  if (input.isDefault) {
    const { error } = await supabase
      .from("rules")
      .update({ is_default: false })
      .eq("tournament_id", rule.tournament_id)
      .eq("is_default", true)
      .neq("id", input.ruleId);
    if (error) throw internalError("既存のデフォルトルールの更新に失敗しました");
  }

  const { error } = await supabase
    .from("rules")
    .update({
      name: input.name,
      uma: input.uma,
      return_points: input.returnPoints,
      is_default: input.isDefault,
    })
    .eq("id", input.ruleId);

  if (error) throw internalError("変更に失敗しました");
  return { ok: true };
}
