import { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { parseCreateMatch } from "@/server/validation/match";
import { authorizeMatchWrite } from "@/server/auth/authorizeMatchWrite";
import { createMatch } from "@/server/usecases/createMatch";

export async function POST(req: NextRequest) {
  return route(async () => {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const writeToken = req.headers.get("x-write-token");
    const input = parseCreateMatch(await parseJson(req));
    await authorizeMatchWrite(input.tournamentId, { clientIp, writeToken });
    return createMatch(input);
  });
}
