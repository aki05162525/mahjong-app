import { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { parseCreateMatch } from "@/server/validation/match";
import { checkMatchIpLimit, consumeTournamentWriteLimit } from "@/lib/rate-limit";
import { rateLimited } from "@/server/http/errors";
import { createMatch } from "@/server/usecases/createMatch";

// 記録の認可は「大会 URL（推測不能な UUID）を知っていること」そのもの。
// トークンは持たず、乱用対策はレート制限のみで行う:
// 1. IP プレフィルタ（緩め）… 生フラッドから DB を守る
// 2. 大会単位バケット … 1大会への書き込み集中を抑える
export async function POST(req: NextRequest) {
  return route(async () => {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (!(await checkMatchIpLimit(clientIp)).ok) {
      throw rateLimited("リクエストが多すぎます。しばらくしてから再試行してください");
    }
    const input = parseCreateMatch(await parseJson(req));
    if (!(await consumeTournamentWriteLimit(input.tournamentId)).ok) {
      throw rateLimited("この大会への記録が集中しています。しばらくしてから再試行してください");
    }
    return createMatch(input);
  });
}
