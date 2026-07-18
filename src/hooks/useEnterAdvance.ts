import { useRef } from "react";

/**
 * 点数入力欄で確定（Enter）を押したら次の欄へフォーカスを送るためのフック。
 * 自動計算で埋まる枠は skip で飛ばし、送り先がなければ末尾要素（保存ボタン）へ
 * フォーカスを移してソフトウェアキーボードを閉じる。
 */
export function useEnterAdvance(count: number, skip: (index: number) => boolean) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const endRef = useRef<HTMLButtonElement | null>(null);

  const nextIndex = (from: number) => {
    for (let j = from + 1; j < count; j++) {
      if (!skip(j)) return j;
    }
    return -1;
  };

  const advanceFrom = (index: number) => {
    const next = nextIndex(index);
    if (next >= 0) inputRefs.current[next]?.focus();
    else endRef.current?.focus();
  };

  // キーボードの確定キー表示。次の欄があれば「次へ」、なければ「完了」。
  const hintFor = (index: number): "next" | "done" => (nextIndex(index) >= 0 ? "next" : "done");

  return { inputRefs, endRef, advanceFrom, hintFor };
}
