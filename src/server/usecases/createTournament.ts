import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { SEED_RULES } from "@/lib/seedRules";
import { requireUser } from "@/server/auth/requireUser";
import { internalError, rateLimited } from "@/server/http/errors";
import type { CreateTournamentInput } from "@/server/validation/tournament";
import type { TablesInsert } from "@/lib/database.types";

export async function createTournament(
  input: CreateTournamentInput,
  clientIp: string
): Promise<{ id: string }> {
  if (!(await checkRateLimit(clientIp)).ok) {
    throw rateLimited("リクエストが多すぎます。しばらくしてから再試行してください");
  }

  const user = await requireUser();
  const supabase = getSupabaseAdmin();
  // id は指定せず DB の gen_random_uuid() に任せる。推測不能な ID であることが
  // 「URL を知っている人だけが書き込める」という認可の前提になっている
  const insert: TablesInsert<"tournaments"> = { name: input.name, owner_id: user.id };

  const { data, error } = await supabase.from("tournaments").insert(insert).select("id").single();
  if (error) throw internalError("大会の作成に失敗しました");

  // 失敗時は大会ごと削除する（rules / players は FK cascade で消える）
  const rollback = async () => {
    await supabase.from("tournaments").delete().eq("id", data.id);
  };

  // デフォルトは大会あたり1件のみ（rules_one_default_per_tournament）。
  // プリセット指定なら seed のフラグを差し替え、カスタムならその1件だけを立てる
  const chosen = input.rule;
  const ruleRows: TablesInsert<"rules">[] = SEED_RULES.map((rule) => ({
    tournament_id: data.id,
    name: rule.name,
    uma: [...rule.uma],
    return_points: rule.returnPoints,
    is_default:
      chosen === undefined ? rule.isDefault : chosen.type === "preset" && chosen.name === rule.name,
  }));
  if (chosen?.type === "custom") {
    ruleRows.push({
      tournament_id: data.id,
      name: chosen.name,
      uma: chosen.uma,
      return_points: chosen.returnPoints,
      is_default: true,
    });
  }

  const { error: seedError } = await supabase.from("rules").insert(ruleRows);
  if (seedError) {
    await rollback();
    throw internalError("大会の作成に失敗しました");
  }

  if (input.players && input.players.length > 0) {
    const { error: playersError } = await supabase
      .from("players")
      .insert(input.players.map((name) => ({ tournament_id: data.id, name })));
    if (playersError) {
      await rollback();
      throw internalError("大会の作成に失敗しました");
    }
  }

  return { id: data.id };
}
