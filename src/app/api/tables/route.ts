import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { parseJson } from "@/server/http/json";
import { createTable } from "@/server/usecases/createTable";
import { parseCreateTable } from "@/server/validation/table";

export async function POST(req: NextRequest) {
  return route(async () => createTable(parseCreateTable(await parseJson(req))));
}
