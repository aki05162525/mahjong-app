import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { deletePlayer } from "@/server/usecases/deletePlayer";
import { updatePlayer } from "@/server/usecases/updatePlayer";
import { parseUpdatePlayer } from "@/server/validation/player";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return updatePlayer(parseUpdatePlayer(id, await parseJson(req)));
  });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return deletePlayer({ playerId: id });
  });
}
