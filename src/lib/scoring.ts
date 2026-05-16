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
  totalPoint: number;
};

const UMA = [30, 10, -10, -30] as const;

export function calculateBasePoint(score: number): number {
  return Math.floor((score - 25000) / 1000);
}

// scores配列の各要素に対応するウマ点を返す（同点按分あり）
export function calculateUmaPoints(scores: number[]): number[] {
  const sorted = [...scores].sort((a, b) => b - a);

  const umaPoints = scores.map((score) => {
    // このscoreが何位集団に属するか
    const startRank = sorted.indexOf(score); // 0-indexed
    const endRank = sorted.lastIndexOf(score); // 0-indexed

    // 該当する順位点を合計して平均
    let sum = 0;
    for (let i = startRank; i <= endRank; i++) {
      sum += UMA[i];
    }
    return sum / (endRank - startRank + 1);
  });

  return umaPoints;
}

// 各プレイヤーの1半荘の結果を計算する
export function calculateMatchResults(inputs: MatchInput[]): MatchResult[] {
  const scores = inputs.map((p) => p.score);
  const sorted = [...scores].sort((a, b) => b - a);
  const umaPoints = calculateUmaPoints(scores);

  return inputs.map((input, i) => {
    // 同点は同順位
    const rank = sorted.indexOf(input.score) + 1;
    const basePoint = calculateBasePoint(input.score);
    const umaPoint = umaPoints[i];
    const totalPoint = basePoint + umaPoint;

    return {
      playerId: input.playerId,
      playerName: input.playerName,
      score: input.score,
      rank,
      basePoint,
      umaPoint,
      totalPoint,
    };
  });
}
