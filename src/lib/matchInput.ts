import { calculateMatchResults } from "./scoring";

// 入力は「百点単位」。例: "250" → 25,000点
export const toActualScore = (input: string): number => Number(input) * 100;

const TOTAL = 100000;

/**
 * 4枠のうち1枠だけ空で、残り3枠が有効な数値なら、合計が100,000点になるよう空き枠を自動計算する。
 * 「4人目」固定ではなく、空いている1枠を埋めるのが肝（席順は結果に影響しないため、どこを空けてもよい）。
 * 返り値: { index, value } もしくは null（1枠だけ空・他3枠有効、でなければ計算しない）。
 */
export function autoFillSlot(scores: string[]): { index: number; value: string } | null {
  const emptyIndexes = scores.map((s, i) => (s === "" ? i : -1)).filter((i) => i >= 0);
  if (emptyIndexes.length !== 1) return null;
  const filled = scores.filter((s) => s !== "");
  if (filled.some((s) => isNaN(Number(s)))) return null;
  const sum = filled.reduce((acc, s) => acc + toActualScore(s), 0);
  return { index: emptyIndexes[0], value: String((TOTAL - sum) / 100) };
}

/**
 * 4枠の点数が確定しているとき、各プレイヤーの最終ポイント（ウマ・オカ込み）を返す。
 * 合計が100,000点でない・空欄あり・ルール未指定なら null（プレビュー非表示）。
 */
export function previewPoints(
  scores: string[],
  rule: { uma: number[]; returnPoints: number } | undefined
): number[] | null {
  if (!rule) return null;
  if (!scores.every((s) => s !== "" && !isNaN(Number(s)))) return null;
  const actual = scores.map(toActualScore);
  if (actual.reduce((a, b) => a + b, 0) !== TOTAL) return null;
  return calculateMatchResults(
    actual.map((score) => ({ playerId: "", playerName: "", score })),
    { uma: rule.uma, returnPoints: rule.returnPoints }
  ).map((r) => r.totalPoint);
}
