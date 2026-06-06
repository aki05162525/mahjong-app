"use client";

import { useState, useMemo, useCallback } from "react";
import { getUsedPlayerIds } from "@/lib/matchFilter";
import { calculateMatchResults } from "@/lib/scoring";
import { fmtPt } from "@/lib/utils";
import type { Player, Table, Match, Rule } from "@/lib/types";

type Props = {
  tournamentId: string;
  players: Player[];
  tables: Table[];
  rules: Rule[];
  matches: Match[];
  matchCounts: Record<string, number>;
  maxRound: number;
};

type PlayerSlot = {
  playerId: string;
  score: string;
};

const EMPTY_SLOT: PlayerSlot = { playerId: "", score: "" };
const WINDS = ["東", "南", "西", "北"] as const;
const toActualScore = (input: string) => Number(input) * 100;

const calcLastScore = (slots: PlayerSlot[]): string => {
  const first3 = slots.slice(0, 3);
  if (first3.some((s) => s.score === "" || isNaN(Number(s.score)))) return "";
  const sum = first3.reduce((acc, s) => acc + toActualScore(s.score), 0);
  return String((100000 - sum) / 100);
};

const newSlots = () => [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT].map((s) => ({ ...s }));

export default function MatchForm({
  tournamentId,
  players,
  tables,
  rules,
  matches,
  matchCounts,
  maxRound,
}: Props) {
  // 卓は複数卓のときだけ意味を持つ。2卓以上あるときだけ卓セレクタを出す。
  const multiTable = tables.length >= 2;

  const [roundNumber, setRoundNumber] = useState("");
  const [tableId, setTableId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [slots, setSlots] = useState<PlayerSlot[]>(newSlots);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // 未選択（ruleId="")のときは大会のデフォルトルールを選択済みとして扱う。
  // effect で setState せず派生値にすることで、初期選択を表現する。
  const defaultRuleId = (rules.find((r) => r.isDefault) ?? rules[0])?.id ?? "";
  const effectiveRuleId = ruleId || defaultRuleId;
  const selectedRule = useMemo(
    () => rules.find((r) => r.id === effectiveRuleId),
    [rules, effectiveRuleId]
  );

  const updateSlot = useCallback((index: number, field: keyof PlayerSlot, value: string) => {
    setSlots((prev) => {
      const next = prev.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      if (field === "score" && index < 3) {
        const auto = calcLastScore(next);
        if (auto !== "") next[3] = { ...next[3], score: auto };
      }
      return next;
    });
  }, []);

  const selectedIds = useMemo(() => slots.map((s) => s.playerId).filter(Boolean), [slots]);
  const usedPlayerIds = useMemo(
    () => (roundNumber ? getUsedPlayerIds(matches, Number(roundNumber)) : new Set<string>()),
    [matches, roundNumber]
  );
  const autoLastScore = useMemo(() => calcLastScore(slots), [slots]);

  const previewPoints = useMemo<number[] | null>(() => {
    if (!selectedRule) return null;
    const allValid = slots.every((s) => s.score !== "" && !isNaN(Number(s.score)));
    if (!allValid) return null;
    const scores = slots.map((s) => toActualScore(s.score));
    if (scores.reduce((sum, s) => sum + s, 0) !== 100000) return null;
    const results = calculateMatchResults(
      scores.map((score) => ({ playerId: "", playerName: "", score })),
      { uma: selectedRule.uma, returnPoints: selectedRule.returnPoints }
    );
    return results.map((r) => r.totalPoint);
  }, [slots, selectedRule]);

  const validate = (): string | null => {
    if (!roundNumber.trim()) return "回戦番号を入力してください";
    if (multiTable && !tableId) return "卓を選択してください";
    if (!effectiveRuleId) return "ルールを選択してください";
    for (let i = 0; i < 4; i++) {
      if (!slots[i].playerId) return `${WINDS[i]}のプレイヤーを選択してください`;
      if (slots[i].score === "") return `${WINDS[i]}の点数を入力してください`;
      if (isNaN(Number(slots[i].score))) return `${WINDS[i]}の点数は数値で入力してください`;
    }
    if (new Set(slots.map((s) => s.playerId)).size !== 4)
      return "同じプレイヤーを重複して選択できません";
    return null;
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    const total = slots.reduce((sum, s) => sum + toActualScore(s.score), 0);
    if (total !== 100000) {
      setError(
        `点数合計が ${total.toLocaleString()} 点です（合計100,000点になるように修正してください）`
      );
      return;
    }
    setSaving(true);
    try {
      const inputs = slots.map((s) => ({ playerId: s.playerId, score: toActualScore(s.score) }));
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          tableId: multiTable ? tableId : null,
          ruleId: effectiveRuleId,
          roundNumber: Number(roundNumber),
          inputs,
        }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "保存に失敗しました");
        return;
      }
      setSlots(newSlots());
      setRoundNumber("");
      setTableId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const selectStyle = { border: "1px solid var(--hairline)", background: "var(--canvas)" };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
        対局結果入力
      </h2>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            回戦
          </label>
          <select
            value={roundNumber}
            onChange={(e) => setRoundNumber(e.target.value)}
            className="rounded-lg px-3 py-3 text-lg w-full"
            style={selectStyle}
          >
            <option value="">選択</option>
            {Array.from({ length: maxRound + 1 }, (_, i) => maxRound + 1 - i).map((n) => (
              <option key={n} value={n}>
                第{n}回戦
              </option>
            ))}
          </select>
        </div>
        {multiTable && (
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              卓
            </label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="rounded-lg px-3 py-3 text-lg w-full"
              style={selectStyle}
            >
              <option value="">選択</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          ルール
        </label>
        <select
          value={effectiveRuleId}
          onChange={(e) => setRuleId(e.target.value)}
          className="rounded-lg px-3 py-3 text-lg w-full"
          style={selectStyle}
        >
          <option value="">選択</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {slots.map((slot, i) => {
        const isAutoFilled = i === 3 && autoLastScore !== "" && slot.score === autoLastScore;
        return (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-base font-medium w-6" style={{ color: "var(--muted)" }}>
              {WINDS[i]}
            </span>
            <select
              value={slot.playerId}
              onChange={(e) => updateSlot(i, "playerId", e.target.value)}
              className="rounded-lg px-3 py-3 text-lg flex-1"
              style={selectStyle}
            >
              <option value="">プレイヤーを選択</option>
              {players
                .filter(
                  (p) =>
                    p.id === slot.playerId ||
                    (!selectedIds.includes(p.id) && !usedPlayerIds.has(p.id))
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{matchCounts[p.id] ?? 0}）
                  </option>
                ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={slot.score}
                onChange={(e) => updateSlot(i, "score", e.target.value)}
                placeholder={i === 3 && autoLastScore !== "" ? autoLastScore : "250"}
                className="rounded-lg px-3 py-3 text-lg w-20 text-right"
                style={{
                  border: "1px solid var(--hairline)",
                  background: isAutoFilled ? "#f0ede8" : "var(--canvas)",
                }}
              />
              <span className="text-lg font-semibold select-none" style={{ color: "var(--muted)" }}>
                00
              </span>
              <span
                className="text-base font-mono font-semibold w-12 text-right"
                style={{
                  color: previewPoints
                    ? previewPoints[i] > 0
                      ? "var(--primary)"
                      : previewPoints[i] < 0
                        ? "var(--error)"
                        : "var(--muted)"
                    : "transparent",
                }}
              >
                {previewPoints ? fmtPt(previewPoints[i]) : "0"}
              </span>
            </div>
          </div>
        );
      })}

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
