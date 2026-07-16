import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { deleteRule } from "@/server/usecases/deleteRule";
import { updateRule } from "@/server/usecases/updateRule";
import { parseUpdateRule } from "@/server/validation/rule";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return updateRule(parseUpdateRule(id, await req.json()));
  });
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    return deleteRule({ ruleId: id });
  });
}
