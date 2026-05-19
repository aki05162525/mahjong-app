import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip).ok) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてから再試行してください" },
      { status: 429 }
    );
  }

  const { tournamentId, password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  if (!tournamentId) {
    return NextResponse.json({ error: "大会IDが必要です" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("tournaments").delete().eq("id", tournamentId);

  if (error) {
    return NextResponse.json({ error: "大会の削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
