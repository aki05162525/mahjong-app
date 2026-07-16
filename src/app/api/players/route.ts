import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { createPlayer } from "@/server/usecases/createPlayer";
import { parseCreatePlayer } from "@/server/validation/player";

export async function POST(req: NextRequest) {
  return route(async () => createPlayer(parseCreatePlayer(await req.json())));
}
