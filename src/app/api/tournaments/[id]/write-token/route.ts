import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { reissueWriteToken } from "@/server/usecases/reissueWriteToken";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const { id } = await params;
    return reissueWriteToken(id, clientIp);
  });
}
