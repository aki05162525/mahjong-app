import { useState } from "react";
import { getSuggestedRound } from "@/lib/matchFilter";
import type { Match } from "@/lib/types";

export const isValidRoundNumber = (value: string) =>
  value.trim() !== "" &&
  Number.isInteger(Number(value)) &&
  Number(value) >= 1 &&
  Number(value) <= 2147483647;

// 未入力の間は取得済みの記録に追従し、入力開始後は Realtime で番号を変えない。
export function useRoundNumber(matches: Match[], tableId?: string | null) {
  const scope = tableId === undefined ? "all" : (tableId ?? "none");
  const [previousScope, setPreviousScope] = useState(scope);
  const [draft, setDraft] = useState<{ value: string; manual: boolean } | null>(null);
  const [savedRounds, setSavedRounds] = useState<Record<string, number>>({});

  if (previousScope !== scope) {
    setPreviousScope(scope);
    // 自分で指定した回戦は卓の選択順によらず保持する。
    if (draft && !draft.manual) setDraft(null);
  }

  const suggestion = Math.max(getSuggestedRound(matches, tableId), (savedRounds[scope] ?? 0) + 1);
  const roundNumber = draft?.value ?? String(suggestion);
  const pinRound = () => setDraft((current) => current ?? { value: roundNumber, manual: false });
  const setRoundNumber = (value: string) => setDraft({ value, manual: true });
  const advanceRound = () => {
    // 保存直後は Realtime が届いていなくても、同じ番号を再提案しない。
    setSavedRounds((current) => ({
      ...current,
      [scope]: Math.max(current[scope] ?? 0, Number(roundNumber)),
    }));
    setDraft(null);
  };

  return { roundNumber, setRoundNumber, pinRound, advanceRound };
}
