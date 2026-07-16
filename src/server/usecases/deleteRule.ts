import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { requireUser } from "@/server/auth/requireUser";
import { badRequest, internalError, notFound } from "@/server/http/errors";
import type { DeleteRuleInput } from "@/server/validation/rule";

export async function deleteRule(input: DeleteRuleInput): Promise<{ ok: true }> {
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

  const { data: status, error } = await supabase.rpc("delete_rule_if_not_default", {
    p_rule_id: input.ruleId,
    p_tournament_id: rule.tournament_id,
  });
  if (error) throw internalError("削除に失敗しました");
  if (status === "not_found") throw notFound("ルールが見つかりません");
  if (status === "default_required") {
    throw badRequest(
      "デフォルトのルールは削除できません。別のルールをデフォルトにしてから削除してください"
    );
  }
  if (status !== "deleted") throw internalError("削除に失敗しました");
  return { ok: true };
}
