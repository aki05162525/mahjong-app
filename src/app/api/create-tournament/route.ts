import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { createTournament } from "@/server/usecases/createTournament";
import { parseCreateTournament } from "@/server/validation/tournament";

export async function POST(req: NextRequest) {
  return route(async () => createTournament(parseCreateTournament(await parseJson(req))));
}
