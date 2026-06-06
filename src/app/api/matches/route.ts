import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { calculateMatchResults } from "@/lib/scoring";

type InputItem = { playerId: string; score: number };

export async function POST(req: NextRequest) {
  const { tournamentId, tableId, roundNumber, ruleId, inputs } = (await req.json()) as {
    tournamentId: string;
    tableId: string;
    roundNumber: number;
    ruleId: string;
    inputs: InputItem[];
  };

  if (!tournamentId || !tableId || roundNumber == null || !Array.isArray(inputs)) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  if (!ruleId) {
    return NextResponse.json({ error: "ルールを選択してください" }, { status: 400 });
  }

  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    return NextResponse.json({ error: "回戦番号は1以上の整数を指定してください" }, { status: 400 });
  }

  if (inputs.length !== 4) {
    return NextResponse.json({ error: "対局結果は4件必要です" }, { status: 400 });
  }

  const playerIds = inputs.map((i) => i.playerId);
  if (new Set(playerIds).size !== 4) {
    return NextResponse.json({ error: "プレイヤーが重複しています" }, { status: 400 });
  }

  // スコアの合計を DB クエリより先に検証する（無駄な往復を避けるため）
  const total = inputs.reduce((s, i) => s + i.score, 0);
  if (total !== 100000) {
    return NextResponse.json(
      { error: `点数合計が ${total.toLocaleString()} 点です（合計100,000点にしてください）` },
      { status: 400 }
    );
  }

  // tableId が当該大会に存在するか確認
  const { count: tableCount } = await getSupabaseAdmin()
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("id", tableId)
    .eq("tournament_id", tournamentId);

  if (!tableCount || tableCount === 0) {
    return NextResponse.json({ error: "指定された卓が見つかりません" }, { status: 400 });
  }

  // 全 playerId が当該大会のプレイヤーか確認
  const { count: playerCount } = await getSupabaseAdmin()
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .in("id", playerIds);

  if (!playerCount || playerCount !== 4) {
    return NextResponse.json({ error: "指定されたプレイヤーが見つかりません" }, { status: 400 });
  }

  // ルールを取得し、当該対局に使った値をスナップショットする
  const { data: rule } = await getSupabaseAdmin()
    .from("rules")
    .select("uma, return_points")
    .eq("id", ruleId)
    .eq("tournament_id", tournamentId)
    .single();

  if (!rule) {
    return NextResponse.json({ error: "指定されたルールが見つかりません" }, { status: 400 });
  }

  const results = calculateMatchResults(
    inputs.map((i) => ({ playerId: i.playerId, playerName: "", score: i.score })),
    { uma: rule.uma, returnPoints: rule.return_points }
  );

  const { data: match, error: matchError } = await getSupabaseAdmin()
    .from("matches")
    .insert({
      tournament_id: tournamentId,
      table_id: tableId,
      round_number: roundNumber,
      rule_id: ruleId,
      uma: rule.uma,
      return_points: rule.return_points,
    })
    .select("id")
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  const { error: resultsError } = await getSupabaseAdmin()
    .from("match_results")
    .insert(
      results.map((r, i) => ({
        match_id: match.id,
        tournament_id: tournamentId,
        player_id: inputs[i].playerId,
        score: r.score,
        rank: r.rank,
        base_point: r.basePoint,
        uma_point: r.umaPoint,
        oka_point: r.okaPoint,
        total_point: r.totalPoint,
      }))
    );

  if (resultsError) {
    await getSupabaseAdmin().from("matches").delete().eq("id", match.id);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ id: match.id });
}
