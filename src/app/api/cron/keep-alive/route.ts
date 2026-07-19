import { getSupabaseAdmin } from "@/infra/supabase-admin";

const KEEP_ALIVE_QUERY_COUNT = 3;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return Response.json({ error: "Cron is not configured" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Supabase Free projects need regular database activity. Vercel Hobby can
  // invoke a cron only once per day, so issue a few minimal read queries here.
  for (let index = 0; index < KEEP_ALIVE_QUERY_COUNT; index += 1) {
    const { error } = await supabase.from("tournaments").select("id").limit(1);

    if (error) {
      console.error("Supabase keep-alive query failed", error.message);
      return Response.json({ error: "Keep-alive query failed" }, { status: 500 });
    }
  }

  return Response.json(
    { ok: true, queries: KEEP_ALIVE_QUERY_COUNT },
    { headers: { "Cache-Control": "no-store" } }
  );
}
