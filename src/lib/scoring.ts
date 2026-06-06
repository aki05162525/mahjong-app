export type MatchInput = {
  playerId: string;
  playerName: string;
  score: number;
};

export type MatchResult = {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  basePoint: number;
  umaPoint: number;
  okaPoint: number;
  totalPoint: number;
};

// 1対局に適用するルール。持ち点は4人麻雀の100,000点固定なので25000とし、可変なのはウマと返し点。
export type ScoringRule = {
  uma: number[];
  returnPoints: number;
};

const STARTING_POINTS = 25000;
const DEFAULT_UMA = [30, 10, -10, -30];
const DEFAULT_RULE: ScoringRule = { uma: DEFAULT_UMA, returnPoints: STARTING_POINTS };

export function calculateBasePoint(score: number, returnPoints = 25000): number {
  return Math.round((score - returnPoints) / 100) / 10;
}

// scores配列の各要素に対応するウマ点を返す（同点按分あり）
export function calculateUmaPoints(scores: number[], uma: number[] = DEFAULT_UMA): number[] {
  const sorted = [...scores].sort((a, b) => b - a);

  const umaPoints = scores.map((score) => {
    // このscoreが何位集団に属するか
    const startRank = sorted.indexOf(score); // 0-indexed
    const endRank = sorted.lastIndexOf(score); // 0-indexed

    // 該当する順位点を合計して平均
    let sum = 0;
    for (let i = startRank; i <= endRank; i++) {
      sum += uma[i];
    }
    return sum / (endRank - startRank + 1);
  });

  return umaPoints;
}

// 各プレイヤーの1半荘の結果を計算する
export function calculateMatchResults(
  inputs: MatchInput[],
  rule: ScoringRule = DEFAULT_RULE
): MatchResult[] {
  const scores = inputs.map((p) => p.score);
  const sorted = [...scores].sort((a, b) => b - a);
  const umaPoints = calculateUmaPoints(scores, rule.uma);

  // オカ = (返し点 - 持ち点) × 人数。トップ群（最高点）が頭割りで受け取る。
  const oka = ((rule.returnPoints - STARTING_POINTS) * scores.length) / 1000;
  const topScore = sorted[0];
  const topCount = scores.filter((s) => s === topScore).length;
  const okaPerTop = oka / topCount;

  return inputs.map((input, i) => {
    // 同点は同順位
    const rank = sorted.indexOf(input.score) + 1;
    const basePoint = calculateBasePoint(input.score, rule.returnPoints);
    const umaPoint = umaPoints[i];
    const okaPoint = input.score === topScore ? okaPerTop : 0;
    const totalPoint = basePoint + umaPoint + okaPoint;

    return {
      playerId: input.playerId,
      playerName: input.playerName,
      score: input.score,
      rank,
      basePoint,
      umaPoint,
      okaPoint,
      totalPoint,
    };
  });
}
