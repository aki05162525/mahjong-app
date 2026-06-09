import { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseCreateMatch } from "@/server/validation/match";
import { createMatch } from "@/server/usecases/createMatch";

export async function POST(req: NextRequest) {
  return route(async () => {
    const input = parseCreateMatch(await req.json());
    return createMatch(input);
  });
}
