import { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { parseCreateMatch } from "@/server/validation/match";
import { createMatch } from "@/server/usecases/createMatch";

// 記録の認可は「大会 URL（推測不能な UUID）を知っていること」そのもの。
// トークンもレート制限も持たない。URL を知る参加者の乱用は行削除で復旧でき、
// URL を知らない生フラッドは Vercel 標準の DDoS 保護に委ねる。
export async function POST(req: NextRequest) {
  return route(async () => createMatch(parseCreateMatch(await parseJson(req))));
}
