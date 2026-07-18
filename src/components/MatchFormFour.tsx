"use client";

import { useState, useMemo } from "react";
import { useDragReorder } from "@/hooks/useDragReorder";
import { toActualScore, autoFillSlot, previewPoints } from "@/lib/matchInput";
import { fmtPt } from "@/lib/utils";
import type { Player, Rule } from "@/lib/types";

type Props = {
  tournamentId: string;
  players: Player[]; // ちょうど4人
  rules: Rule[];
  maxRound: number;
};

const WINDS = ["東", "南", "西", "北"] as const;
const ROW_H = 56;

const sameOrder = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

const arrayMove = (arr: string[], from: number, to: number) => {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * ちょうど4人のときの対局入力。プレイヤー選択も回戦番号入力も不要（組み合わせは1通り、回戦は通し番号）。
 * 登録4人を東南西北に並べ、ドラッグで席順を変え、点数だけ入力する。並び順は保存後も引き継ぐ。
 */
export default function MatchFormFour({ tournamentId, players, rules, maxRound }: Props) {
  const ids = players.map((p) => p.id);
  const idsKey = ids.join(",");

  const [order, setOrder] = useState<string[]>(ids);
  const [prevIdsKey, setPrevIdsKey] = useState(idsKey);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [autoId, setAutoId] = useState<string | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // プレイヤーの増減（リネームではなく追加/削除）に追従。並び順は保てる範囲で維持する。
  // effect ではなくレンダー中に prop の変化を検知して調整する（React 推奨パターン）。
  if (idsKey !== prevIdsKey) {
    setPrevIdsKey(idsKey);
    const kept = order.filter((id) => ids.includes(id));
    const added = ids.filter((id) => !order.includes(id));
    const next = [...kept, ...added];
    if (!sameOrder(next, order)) setOrder(next);
  }

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const defaultRuleId = (rules.find((r) => r.isDefault) ?? rules[0])?.id ?? "";
  const effectiveRuleId = ruleId || defaultRuleId;
  const selectedRule = useMemo(
    () => rules.find((r) => r.id === effectiveRuleId),
    [rules, effectiveRuleId]
  );

  const scoresArr = useMemo(() => order.map((id) => scores[id] ?? ""), [order, scores]);
  const preview = useMemo(() => previewPoints(scoresArr, selectedRule), [scoresArr, selectedRule]);
  const autoTarget = useMemo(() => autoFillSlot(scoresArr), [scoresArr]);
  const nextRound = maxRound + 1;

  const { listRef, styleFor, handleProps, draggingIndex } = useDragReorder<HTMLUListElement>(
    order.length,
    (from, to) => setOrder((prev) => arrayMove(prev, from, to))
  );

  const updateScore = (id: string, value: string) => {
    const working = { ...scores, [id]: value };
    // 自動枠以外を編集したら、自動枠を一旦空にして再計算する（依存枠を常に追従させる）。
    if (autoId && autoId !== id) working[autoId] = "";
    const arr = order.map((pid) => working[pid] ?? "");
    const auto = autoFillSlot(arr);
    if (auto) {
      const targetId = order[auto.index];
      working[targetId] = auto.value;
      setAutoId(targetId);
    } else {
      setAutoId(null);
    }
    setScores(working);
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    for (let i = 0; i < 4; i++) {
      if (scoresArr[i] === "") return setError(`${WINDS[i]}の点数を入力してください`);
      if (isNaN(Number(scoresArr[i]))) return setError(`${WINDS[i]}の点数は数値で入力してください`);
    }
    if (!effectiveRuleId) return setError("ルールを選択してください");
    const total = scoresArr.reduce((s, x) => s + toActualScore(x), 0);
    if (total !== 100000) {
      return setError(
        `点数合計が ${total.toLocaleString()} 点です（合計100,000点になるように修正してください）`
      );
    }
    setSaving(true);
    try {
      const inputs = order.map((id) => ({ playerId: id, score: toActualScore(scores[id]) }));
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          tableId: null,
          ruleId: effectiveRuleId,
          roundNumber: nextRound,
          inputs,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      setScores({}); // 並び順(order)は引き継ぎ、点数だけクリア
      setAutoId(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
          対局結果入力
        </h2>
        <span className="text-base font-semibold" style={{ color: "var(--primary)" }}>
          第{nextRound}回戦
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          ルール
        </label>
        <select
          value={effectiveRuleId}
          onChange={(e) => setRuleId(e.target.value)}
          className="rounded-lg px-3 py-3 text-lg w-full"
          style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
        >
          <option value="">選択</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        {/* 風ラベルは席（位置）に固定。プレイヤーだけが動く。 */}
        <div className="flex flex-col gap-2">
          {WINDS.map((w) => (
            <div
              key={w}
              className="flex items-center justify-center text-base font-medium w-6"
              style={{ height: ROW_H, color: "var(--muted)" }}
            >
              {w}
            </div>
          ))}
        </div>

        <ul ref={listRef} className="relative flex-1 flex flex-col gap-2">
          {order.map((id, i) => {
            const st = styleFor(i);
            const player = playerById.get(id);
            const val = scores[id] ?? "";
            const isAuto = autoId === id && val !== "";
            const placeholder =
              autoTarget && order[autoTarget.index] === id ? autoTarget.value : "250";
            const dragging = draggingIndex === i;
            // ドラッグ中は行全体の箱を消し、名前部分だけをカード化したチップにする。
            // 点数欄・00・ポイントはフェード（場所は保持してレイアウト＝送り幅を崩さない）。
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg px-2"
                style={{
                  height: ROW_H,
                  transform: st.transform,
                  transition: st.transition,
                  zIndex: st.zIndex,
                  position: "relative",
                  background: dragging ? "transparent" : "var(--canvas)",
                  border: dragging ? "1px solid transparent" : "1px solid var(--hairline)",
                  boxShadow: "none",
                }}
              >
                {/* 名前全体を掴んで並べ替え。点数入力は掴めないよう、ここだけを取っ手にする。 */}
                <div
                  className={`flex items-center gap-2 min-w-0 select-none active:cursor-grabbing ${dragging ? "" : "flex-1"}`}
                  style={{
                    touchAction: "none",
                    cursor: "grab",
                    ...(dragging
                      ? {
                          background: "var(--surface-card)",
                          border: "1px solid var(--hairline)",
                          borderRadius: 8,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          padding: "6px 10px",
                        }
                      : {}),
                  }}
                  {...handleProps(i)}
                >
                  <svg
                    width="14"
                    height="20"
                    viewBox="0 0 14 20"
                    aria-hidden="true"
                    className="shrink-0"
                    style={{ color: "var(--muted)" }}
                  >
                    {[5, 10, 15].map((cy) =>
                      [4, 10].map((cx) => (
                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="currentColor" />
                      ))
                    )}
                  </svg>
                  <span className="flex-1 truncate text-lg" style={{ color: "var(--body)" }}>
                    {player?.name ?? "?"}
                  </span>
                </div>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => updateScore(id, e.target.value)}
                  placeholder={placeholder}
                  className="rounded-lg px-3 py-3 text-lg w-20 text-right"
                  style={{
                    border: "1px solid var(--hairline)",
                    background: isAuto ? "#f0ede8" : "var(--canvas)",
                    opacity: dragging ? 0 : 1,
                  }}
                />
                <span
                  className="text-lg font-semibold select-none"
                  style={{ color: "var(--muted)", opacity: dragging ? 0 : 1 }}
                >
                  00
                </span>
                <span
                  className="text-base font-mono font-semibold w-12 text-right"
                  style={{
                    opacity: dragging ? 0 : 1,
                    color: preview
                      ? preview[i] > 0
                        ? "var(--primary)"
                        : preview[i] < 0
                          ? "var(--error)"
                          : "var(--muted)"
                      : "transparent",
                  }}
                >
                  {preview ? fmtPt(preview[i]) : "0"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p className="font-medium" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="font-medium" style={{ color: "var(--success)" }}>
          保存しました！
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg px-4 py-4 text-lg font-semibold active:opacity-80 disabled:opacity-50"
        style={{ background: "var(--primary)", color: "#fff" }}
      >
        {saving ? "保存中..." : "対局結果を保存"}
      </button>
    </div>
  );
}
