import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;

  const { data: match, error: matchError } = await getSupabaseAdmin()
    .from("matches")
    .select("tournament_id, round_number")
    .eq("id", id)
    .single();

  if (matchError && matchError.code !== "PGRST116") {
    return NextResponse.json({ error: "内部エラー" }, { status: 500 });
  }
  if (!match) {
    return NextResponse.json({ error: "対局が見つかりません" }, { status: 404 });
  }

  const { data: tournament, error: tournamentError } = await getSupabaseAdmin()
    .from("tournaments")
    .select("owner_id")
    .eq("id", match.tournament_id)
    .single();

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: "内部エラー" }, { status: 500 });
  }
  if (tournament.owner_id !== user.id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { error } = await getSupabaseAdmin().from("matches").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }

  // 4人モード（登録ちょうど4人＝回戦が通し番号）のときだけ、削除した回戦より後ろを繰り上げて
  // 1..N の連番を保つ。5人以上は回戦が複数卓にまたがり手動採番なので触らない。
  const { count: playerCount } = await getSupabaseAdmin()
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", match.tournament_id);

  if (playerCount === 4) {
    const { data: subsequent } = await getSupabaseAdmin()
      .from("matches")
      .select("id, round_number")
      .eq("tournament_id", match.tournament_id)
      .gt("round_number", match.round_number);

    if (subsequent && subsequent.length > 0) {
      await Promise.all(
        subsequent.map((m) =>
          getSupabaseAdmin()
            .from("matches")
            .update({ round_number: m.round_number - 1 })
            .eq("id", m.id)
        )
      );
    }
  }

  return NextResponse.json({ ok: true });
}
