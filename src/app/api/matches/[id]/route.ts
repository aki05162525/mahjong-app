import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { deleteMatch } from "@/server/usecases/deleteMatch";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    return deleteMatch({ matchId: id });
  });
}
