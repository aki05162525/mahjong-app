import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { badRequest, internalError, notFound } from "@/server/http/errors";
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

  const { data: status, error } = await supabase.rpc("update_rule_atomic", {
    p_rule_id: input.ruleId,
    p_tournament_id: rule.tournament_id,
    p_name: input.name,
    p_uma: input.uma,
    p_return_points: input.returnPoints,
    ...(input.isDefault === undefined ? {} : { p_is_default: input.isDefault }),
  });

  if (error) throw internalError("変更に失敗しました");
  if (status === "not_found") throw notFound("ルールが見つかりません");
  if (status === "default_required") {
    throw badRequest("デフォルトのルールは解除できません。別のルールをデフォルトにしてください");
  }
  if (status !== "updated") throw internalError("変更に失敗しました");
  return { ok: true };
}
