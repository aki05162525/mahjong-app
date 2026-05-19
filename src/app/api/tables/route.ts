import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const { tournamentId, name } = await req.json();

  if (!tournamentId) {
    return NextResponse.json({ error: "大会IDが必要です" }, { status: 400 });
  }
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "卓名を入力してください" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tables")
    .insert({ tournament_id: tournamentId, name: trimmed })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
