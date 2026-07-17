import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";
import { checkMatchIpLimit, consumeTournamentWriteLimit } from "@/lib/rate-limit";
import { invalidWriteToken, rateLimited, unauthorized, internalError } from "@/server/http/errors";
import { verifyWriteToken } from "./writeToken";

export type MatchWriteAuth = {
  clientIp: string;
  writeToken: string | null;
};

async function isTournamentOwner(tournamentId: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;

  const { data, error } = await getSupabaseAdmin()
    .from("tournaments")
    .select("owner_id")
    .eq("id", tournamentId)
    .single();

  if (error && error.code !== "PGRST116") throw internalError("大会の確認に失敗しました");
  return data?.owner_id === user.id;
}

/**
 * POST /api/matches の認可。順序は固定（issue #69）:
 * 1. IP プレフィルタ（緩め）… 生フラッドから後段の DB ルックアップを守る
 * 2. 記録トークンのハッシュ照合 || ログイン済みオーナー
 * 3. 検証通過時のみ大会単位バケットを消費
 *    （無効トークンの連投で大会の正規枠を枯渇させられないため、消費は必ず検証の後）
 */
export async function authorizeMatchWrite(
  tournamentId: string,
  { clientIp, writeToken }: MatchWriteAuth
): Promise<void> {
  if (!(await checkMatchIpLimit(clientIp)).ok) {
    throw rateLimited("リクエストが多すぎます。しばらくしてから再試行してください");
  }

  const tokenValid = writeToken !== null && (await verifyWriteToken(tournamentId, writeToken));
  const authorized = tokenValid || (await isTournamentOwner(tournamentId));
  if (!authorized) {
    // トークンを提示したのに無効 → 専用コードでクライアントに「リンクが無効」の UX を出させる
    if (writeToken !== null) throw invalidWriteToken();
    throw unauthorized("記録には記録用リンクが必要です");
  }

  if (!(await consumeTournamentWriteLimit(tournamentId)).ok) {
    throw rateLimited("この大会への記録が集中しています。しばらくしてから再試行してください");
  }
}
