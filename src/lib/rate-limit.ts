import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// フェイルオープンは意図的な設計判断（docs/rate-limiting-upstash.md）。
// Upstash 障害中はレートリミットが無効になるが、POST /api/matches は
// 記録トークン / オーナー検証が残るため「トークン検証のみで守る」リスクを受け入れる。
// 障害検知のため console.error でログは残す。

let redis: Redis | null = null;

function getRedis(): Redis {
  // トップレベルで Redis.fromEnv() を呼ぶと env 未設定時に import ごと落ちるため遅延初期化
  if (!redis) redis = Redis.fromEnv();
  return redis;
}

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(10, "60 s"),
    });
  }
  return ratelimit;
}

export async function checkRateLimit(ip: string): Promise<{ ok: boolean }> {
  try {
    const { success } = await getRatelimit().limit(ip);
    return { ok: success };
  } catch (e) {
    console.error("rate-limit: Upstash unavailable, failing open", e);
    return { ok: true };
  }
}

// --- POST /api/matches 用（2段構え） ---
// 1) IP プレフィルタ（緩め）: 生フラッドから後段のトークン照合（DB ルックアップ）を守る
// 2) 大会単位トークンバケット: 認可を通過したリクエストだけが消費する
//    （無効トークンの連投で大会の正規枠を枯渇させられないよう、消費は検証通過後）

let matchIpLimiter: Ratelimit | null = null;

function getMatchIpLimiter(): Ratelimit {
  if (!matchIpLimiter) {
    matchIpLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(60, "60 s"),
      prefix: "@upstash/ratelimit/match-ip",
    });
  }
  return matchIpLimiter;
}

export async function checkMatchIpLimit(ip: string): Promise<{ ok: boolean }> {
  try {
    const { success } = await getMatchIpLimiter().limit(ip);
    return { ok: success };
  } catch (e) {
    console.error("rate-limit: Upstash unavailable, failing open", e);
    return { ok: true };
  }
}

let tournamentWriteLimiter: Ratelimit | null = null;

function getTournamentWriteLimiter(): Ratelimit {
  if (!tournamentWriteLimiter) {
    tournamentWriteLimiter = new Ratelimit({
      redis: getRedis(),
      // 容量30・補充10/分: 大会中の連続入力（バースト）は許しつつ、書き込み総量に上限を設ける
      limiter: Ratelimit.tokenBucket(10, "60 s", 30),
      prefix: "@upstash/ratelimit/tournament-write",
    });
  }
  return tournamentWriteLimiter;
}

export async function consumeTournamentWriteLimit(tournamentId: string): Promise<{ ok: boolean }> {
  try {
    const { success } = await getTournamentWriteLimiter().limit(`tournament:${tournamentId}`);
    return { ok: success };
  } catch (e) {
    console.error("rate-limit: Upstash unavailable, failing open", e);
    return { ok: true };
  }
}
