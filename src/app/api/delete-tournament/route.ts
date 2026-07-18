import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { deleteTournament } from "@/server/usecases/deleteTournament";
import { parseDeleteTournament } from "@/server/validation/tournament";

export async function POST(req: NextRequest) {
  return route(async () => deleteTournament(parseDeleteTournament(await parseJson(req))));
}
