import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;

  const { data: match } = await supabaseAdmin
    .from("matches")
    .select("tournament_id")
    .eq("id", id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "対局が見つかりません" }, { status: 404 });
  }

  const { data: tournament } = await supabaseAdmin
    .from("tournaments")
    .select("owner_id")
    .eq("id", match.tournament_id)
    .single();

  if (!tournament || tournament.owner_id !== user.id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("matches").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
