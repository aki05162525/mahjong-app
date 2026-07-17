import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { generateWriteToken } from "@/server/auth/writeToken";
import { internalError, rateLimited } from "@/server/http/errors";

// token_hash を作り直す＝配布済みの旧リンクは即失効する。
// raw は再表示できないため、紛失時もこの API で再発行する。
// upsert なのでトークン導入前に作られた大会への初回発行も兼ねる。
export async function reissueWriteToken(
  tournamentId: string,
  clientIp: string
): Promise<{ writeToken: string }> {
  if (!(await checkRateLimit(clientIp)).ok) {
    throw rateLimited("リクエストが多すぎます。しばらくしてから再試行してください");
  }

  await requireTournamentOwner(tournamentId);

  const { raw, hash } = generateWriteToken();
  const { error } = await getSupabaseAdmin()
    .from("tournament_write_secrets")
    .upsert({ tournament_id: tournamentId, token_hash: hash });

  if (error) throw internalError("記録用リンクの再発行に失敗しました");
  return { writeToken: raw };
}
