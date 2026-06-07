import { getAuthUser } from "@/infra/supabase-server";
import { unauthorized } from "../http/errors";

export async function requireUser() {
  const user = await getAuthUser();
  if (!user) throw unauthorized();

  return user;
}
