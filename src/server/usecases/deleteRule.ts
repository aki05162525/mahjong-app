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
    .select("tournament_id, is_default")
    .eq("id", input.ruleId)
    .single();

  if (ruleError && ruleError.code !== "PGRST116") throw internalError();
  if (!rule) throw notFound("ルールが見つかりません");

  await requireTournamentOwner(rule.tournament_id, user);
  if (rule.is_default) {
    throw badRequest(
      "デフォルトのルールは削除できません。別のルールをデフォルトにしてから削除してください"
    );
  }

  const { error } = await supabase.from("rules").delete().eq("id", input.ruleId);
  if (error) throw internalError("削除に失敗しました");
  return { ok: true };
}
