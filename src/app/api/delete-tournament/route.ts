import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { deleteTournament } from "@/server/usecases/deleteTournament";
import { parseDeleteTournament } from "@/server/validation/tournament";

export async function POST(req: NextRequest) {
  return route(async () => {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    return deleteTournament(parseDeleteTournament(await req.json()), clientIp);
  });
}
