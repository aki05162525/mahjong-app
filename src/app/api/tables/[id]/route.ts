import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { deleteTable } from "@/server/usecases/deleteTable";
import { updateTable } from "@/server/usecases/updateTable";
import { parseUpdateTable } from "@/server/validation/table";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return updateTable(parseUpdateTable(id, await parseJson(req)));
  });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return deleteTable({ tableId: id });
  });
}
