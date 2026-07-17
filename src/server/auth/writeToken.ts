import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { internalError } from "@/server/http/errors";

// 記録トークン（capability）。raw は発行時に一度だけ返し、DB には sha256 ハッシュのみ保存する。
// raw が漏れる経路（DB ダンプ・Data API・ログ）からトークンを守るため、raw は保存も再表示もしない。

export function generateWriteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashWriteToken(raw) };
}

export function hashWriteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function verifyWriteToken(tournamentId: string, raw: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("tournament_write_secrets")
    .select("token_hash")
    .eq("tournament_id", tournamentId)
    .single();

  if (error && error.code !== "PGRST116") throw internalError("トークンの照合に失敗しました");
  if (!data) return false;

  const stored = Buffer.from(data.token_hash, "hex");
  const presented = Buffer.from(hashWriteToken(raw), "hex");
  // timingSafeEqual は長さ不一致で例外を投げるため先に弾く（長さは秘密情報ではない）
  if (stored.length !== presented.length) return false;
  return timingSafeEqual(stored, presented);
}
