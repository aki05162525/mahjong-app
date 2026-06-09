import { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { badRequest } from "@/server/http/errors";
import { parseCreateMatch } from "@/server/validation/match";
import { createMatch } from "@/server/usecases/createMatch";

export async function POST(req: NextRequest) {
  return route(async () => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw badRequest("リクエストボディが不正なJSONです");
    }
    const input = parseCreateMatch(raw);
    return createMatch(input);
  });
}
