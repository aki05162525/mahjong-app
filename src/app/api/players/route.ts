import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { tournamentId, name } = await req.json();

  if (!tournamentId) {
    return NextResponse.json({ error: "大会IDが必要です" }, { status: 400 });
  }

  const { data: tournament, error: tournamentError } = await supabaseAdmin
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

  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "名前を入力してください" }, { status: 400 });
  }
  if (trimmed.length > 20) {
    return NextResponse.json({ error: "名前は20文字以内で入力してください" }, { status: 400 });
  }

  const { count } = await supabaseAdmin
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("name", trimmed);

  if (count && count > 0) {
    return NextResponse.json({ error: "同じ名前のプレイヤーが既に存在します" }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("players")
    .insert({ tournament_id: tournamentId, name: trimmed })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
