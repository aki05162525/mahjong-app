import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { updatePlayer } from "@/server/usecases/updatePlayer";
import { parseUpdatePlayer } from "@/server/validation/player";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    return updatePlayer(parseUpdatePlayer(id, await parseJson(req)));
  });
}
