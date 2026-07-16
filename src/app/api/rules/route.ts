import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { createRule } from "@/server/usecases/createRule";
import { parseCreateRule } from "@/server/validation/rule";

export async function POST(req: NextRequest) {
  return route(async () => createRule(parseCreateRule(await req.json())));
}
