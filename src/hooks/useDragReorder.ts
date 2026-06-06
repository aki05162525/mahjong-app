import { useRef, useState, useCallback, useEffect } from "react";

type DragState = {
  from: number;
  over: number;
  dy: number;
  stride: number;
};

/**
 * 縦リストの並べ替えを Pointer Events だけで実装するフック（依存ライブラリなし）。
 * HTML5 Drag and Drop はタッチで動かないため、PointerEvent を使う。
 *
 * イベントはドラッグ開始時に window へ直接張る（setPointerCapture + React 委譲だと
 * 捕捉した pointermove がハンドラに届かず「動かしても元に戻る」事象が起きるため）。
 *
 * 仕組み: DOM の並びは固定（呼び出し側の order のまま）にし、ドラッグ中は CSS transform で
 * 各行をずらして隙間を見せる。確定時に onReorder(from, to) で配列を入れ替えてもらう。
 */
export function useDragReorder<T extends HTMLElement = HTMLElement>(
  length: number,
  onReorder: (from: number, to: number) => void
) {
  const listRef = useRef<T>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // ドラッグ中のみ有効なクリーンアップ（張った window リスナを全て外す）。
  const cleanupRef = useRef<(() => void) | null>(null);
  // 最新の onReorder / length をドラッグ中の closure から参照するための ref（render 中は書かない）。
  const onReorderRef = useRef(onReorder);
  const lengthRef = useRef(length);
  useEffect(() => {
    onReorderRef.current = onReorder;
    lengthRef.current = length;
  });

  const onHandlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const list = listRef.current;
      if (!list) return;
      const items = list.children;
      const first = items[0] as HTMLElement | undefined;
      const second = items[1] as HTMLElement | undefined;
      // 行の送り幅（gap 込み）。隣接行の offsetTop 差から測り、取れなければ高さで代用。
      const stride = (second ? second.offsetTop - first!.offsetTop : first?.offsetHeight) || 1;
      const from = index;
      const startY = e.clientY;
      const pointerId = e.pointerId;
      let over = index;

      cleanupRef.current?.();
      cleanupRef.current = null;
      setDrag({ from, over, dy: 0, stride });

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        const dy = ev.clientY - startY;
        over = Math.max(0, Math.min(lengthRef.current - 1, from + Math.round(dy / stride)));
        setDrag({ from, over, dy, stride });
      };
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanupRef.current?.();
        cleanupRef.current = null;
        document.body.style.userSelect = "";
        if (from !== over) onReorderRef.current(from, over);
        setDrag(null);
      };

      cleanupRef.current = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    []
  );

  // アンマウント時にドラッグ途中なら掃除する。
  useEffect(
    () => () => {
      cleanupRef.current?.();
      document.body.style.userSelect = "";
    },
    []
  );

  // DOM index ごとの transform（掴んだ行は指追従、間の行は1つ分ずれる）
  const styleFor = useCallback(
    (index: number): { transform: string; transition: string; zIndex: number } => {
      // ドラッグ中以外は transition なし。ドロップ時に「元位置への戻りアニメ」と並べ替えが衝突して
      // ガクつくのを防ぐ（指を離したら新しい並びへ即座に収まる）。
      if (!drag) return { transform: "", transition: "none", zIndex: 0 };
      const { from, over, dy, stride } = drag;
      if (index === from)
        return { transform: `translateY(${dy}px)`, transition: "none", zIndex: 10 };
      let shift = 0;
      if (from < over && index > from && index <= over) shift = -stride;
      else if (from > over && index < from && index >= over) shift = stride;
      return { transform: `translateY(${shift}px)`, transition: "transform 150ms", zIndex: 0 };
    },
    [drag]
  );

  return {
    listRef,
    draggingIndex: drag?.from ?? null,
    styleFor,
    // 掴む要素に展開する。掴む要素には別途 touch-action: none を指定すること（スクロール競合の回避）。
    handleProps: (index: number) => ({
      onPointerDown: onHandlePointerDown(index),
    }),
  };
}
