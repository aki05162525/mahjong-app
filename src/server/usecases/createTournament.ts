import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { SEED_RULES } from "@/lib/seedRules";
import { requireUser } from "@/server/auth/requireUser";
import { conflict, internalError, rateLimited } from "@/server/http/errors";
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
  const insert: TablesInsert<"tournaments"> = input.customId
    ? { id: input.customId, name: input.name, owner_id: user.id }
    : { name: input.name, owner_id: user.id };

  const { data, error } = await supabase.from("tournaments").insert(insert).select("id").single();
  if (error) {
    if (error.code === "23505" && input.customId) {
      throw conflict(`「${input.customId}」はすでに使われています`);
    }
    throw internalError("大会の作成に失敗しました");
  }

  const { error: seedError } = await supabase.from("rules").insert(
    SEED_RULES.map((rule) => ({
      tournament_id: data.id,
      name: rule.name,
      uma: [...rule.uma],
      return_points: rule.returnPoints,
      is_default: rule.isDefault,
    }))
  );

  if (seedError) {
    await supabase.from("tournaments").delete().eq("id", data.id);
    throw internalError("大会の作成に失敗しました");
  }
  return { id: data.id };
}
