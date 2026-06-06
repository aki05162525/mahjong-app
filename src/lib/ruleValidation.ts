export type RuleInput = {
  name: string;
  uma: number[];
  returnPoints: number;
};

// 持ち点は4人麻雀の合計100,000点固定なので、可変なのはウマと返し点。
const STARTING_POINTS = 25000;

// 入力が不正ならエラーメッセージ、正常なら null を返す。
export function validateRule(input: RuleInput): string | null {
  const name = (input.name ?? "").trim();
  if (!name) {
    return "ルール名（名前）を入力してください";
  }
  if (name.length > 30) {
    return "ルール名は30文字以内で入力してください";
  }

  const { uma, returnPoints } = input;
  if (!Array.isArray(uma) || uma.length !== 4 || !uma.every((u) => Number.isInteger(u))) {
    return "ウマは整数4つで指定してください";
  }
  if (uma.reduce((s, u) => s + u, 0) !== 0) {
    return "ウマの合計は0にしてください";
  }

  if (!Number.isInteger(returnPoints) || returnPoints < STARTING_POINTS) {
    return `返し点は${STARTING_POINTS}以上の整数で指定してください`;
  }

  return null;
}
