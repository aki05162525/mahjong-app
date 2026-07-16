import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { createPlayer } from "@/server/usecases/createPlayer";
import { parseCreatePlayer } from "@/server/validation/player";

export async function POST(req: NextRequest) {
  return route(async () => createPlayer(parseCreatePlayer(await parseJson(req))));
}
