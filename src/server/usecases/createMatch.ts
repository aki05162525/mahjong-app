import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { calculateMatchResults } from "@/lib/scoring";
import { badRequest, notFound, internalError } from "@/server/http/errors";
import type { CreateMatchInput } from "@/server/validation/match";

export async function createMatch(input: CreateMatchInput): Promise<{ id: string }> {
  const { tournamentId, tableId, roundNumber, ruleId, inputs } = input;
  const normalizedTableId = tableId ?? null;

  const playerIds = inputs.map((i) => i.playerId);
  if (new Set(playerIds).size !== 4) {
    throw badRequest("プレイヤーが重複しています");
  }

  const total = inputs.reduce((s, i) => s + i.score, 0);
  if (total !== 100000) {
    throw badRequest(`点数合計が ${total.toLocaleString()} 点です（合計100,000点にしてください）`);
  }

  const supabase = getSupabaseAdmin();

  if (normalizedTableId) {
    const { count: tableCount, error: tableError } = await supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("id", normalizedTableId)
      .eq("tournament_id", tournamentId);

    if (tableError) throw internalError("卓の確認に失敗しました");
    if (!tableCount || tableCount === 0) {
      throw notFound("指定された卓が見つかりません");
    }
  } else {
    // 卓を省略できるのは単一卓のときだけ。2卓以上ある大会ではどの卓か曖昧になるため必須。
    const { count: tableCount, error: tableError } = await supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    if (tableError) throw internalError("卓の確認に失敗しました");
    if (tableCount && tableCount >= 2) {
      throw badRequest("卓を選択してください");
    }
  }

  const { count: playerCount, error: playerError } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .in("id", playerIds);

  if (playerError) throw internalError("プレイヤーの確認に失敗しました");
  if (!playerCount || playerCount !== 4) {
    throw notFound("指定されたプレイヤーが見つかりません");
  }

  const { data: rule, error: ruleError } = await supabase
    .from("rules")
    .select("uma, return_points")
    .eq("id", ruleId)
    .eq("tournament_id", tournamentId)
    .single();

  if (ruleError && ruleError.code !== "PGRST116") throw internalError("ルールの取得に失敗しました");
  if (!rule) {
    throw notFound("指定されたルールが見つかりません");
  }

  const results = calculateMatchResults(
    inputs.map((i) => ({ playerId: i.playerId, playerName: "", score: i.score })),
    { uma: rule.uma, returnPoints: rule.return_points }
  );

  const rpcInput = {
    p_tournament_id: tournamentId,
    p_round_number: roundNumber,
    p_rule_id: ruleId,
    p_uma: rule.uma,
    p_return_points: rule.return_points,
    p_results: results.map((r) => ({
      player_id: r.playerId,
      score: r.score,
      rank: r.rank,
      base_point: r.basePoint,
      uma_point: r.umaPoint,
      oka_point: r.okaPoint,
      total_point: r.totalPoint,
    })),
    ...(normalizedTableId ? { p_table_id: normalizedTableId } : {}),
  };

  const { data: matchId, error: rpcError } = await supabase.rpc(
    "create_match_with_results",
    rpcInput
  );

  if (rpcError || !matchId) throw internalError("保存に失敗しました");
  return { id: matchId };
}
