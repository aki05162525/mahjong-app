import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { createTournament } from "@/server/usecases/createTournament";
import { parseCreateTournament } from "@/server/validation/tournament";

export async function POST(req: NextRequest) {
  return route(async () => {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    return createTournament(parseCreateTournament(await req.json()), clientIp);
  });
}
