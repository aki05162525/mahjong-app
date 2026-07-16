import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { updateTable } from "@/server/usecases/updateTable";
import { parseUpdateTable } from "@/server/validation/table";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    return updateTable(parseUpdateTable(id, await parseJson(req)));
  });
}
