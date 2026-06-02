import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip).ok) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてから再試行してください" },
      { status: 429 }
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { tournamentId } = await req.json();

  if (!tournamentId) {
    return NextResponse.json({ error: "大会IDが必要です" }, { status: 400 });
  }

  const { data: tournament, error: tournamentError } = await getSupabaseAdmin()
    .from("tournaments")
    .select("owner_id")
    .eq("id", tournamentId)
    .single();

  if (tournamentError && tournamentError.code !== "PGRST116") {
    return NextResponse.json({ error: "内部エラー" }, { status: 500 });
  }
  if (!tournament) {
    return NextResponse.json({ error: "大会が見つかりません" }, { status: 404 });
  }

  if (tournament.owner_id !== user.id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { error } = await getSupabaseAdmin().from("tournaments").delete().eq("id", tournamentId);

  if (error) {
    return NextResponse.json({ error: "大会の削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
