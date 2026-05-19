import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateMatchResults } from "@/lib/scoring";

type InputItem = { playerId: string; score: number };

export async function POST(req: NextRequest) {
  const { tournamentId, tableId, roundNumber, inputs } = await req.json() as {
    tournamentId: string;
    tableId: string;
    roundNumber: number;
    inputs: InputItem[];
  };

  if (!tournamentId || !tableId || !roundNumber || !inputs?.length) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const total = inputs.reduce((s: number, i: InputItem) => s + i.score, 0);
  if (total !== 100000) {
    return NextResponse.json({ error: `点数合計が ${total.toLocaleString()} 点です（合計100,000点にしてください）` }, { status: 400 });
  }

  const results = calculateMatchResults(
    inputs.map((i) => ({ playerId: i.playerId, playerName: "", score: i.score }))
  );

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .insert({ tournament_id: tournamentId, table_id: tableId, round_number: roundNumber })
    .select("id")
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  const { error: resultsError } = await supabaseAdmin.from("match_results").insert(
    results.map((r, i) => ({
      match_id: match.id,
      player_id: inputs[i].playerId,
      score: r.score,
      rank: r.rank,
      base_point: r.basePoint,
      uma_point: r.umaPoint,
      total_point: r.totalPoint,
    }))
  );

  if (resultsError) {
    await supabaseAdmin.from("matches").delete().eq("id", match.id);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ id: match.id });
}
