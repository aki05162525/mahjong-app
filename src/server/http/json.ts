import { badRequest } from "./errors";

export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("リクエストボディが不正なJSONです");
  }
}
