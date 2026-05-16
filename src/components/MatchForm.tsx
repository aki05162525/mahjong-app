"use client";

import { useState } from "react";
import { saveMatch } from "@/lib/firestore";
import type { Player } from "@/lib/firestore";

type Props = {
  tournamentId: string;
  players: Player[];
  matchCounts: Record<string, number>;
  maxRound: number;
};

type PlayerSlot = {
  playerId: string;
  score: string;
};

const EMPTY_SLOT: PlayerSlot = { playerId: "", score: "" };
const toActualScore = (input: string) => Number(input) * 100;

const calcLastScore = (slots: PlayerSlot[]): string => {
  const first3 = slots.slice(0, 3);
  if (first3.some((s) => s.score === "" || isNaN(Number(s.score)))) return "";
  const sum = first3.reduce((acc, s) => acc + toActualScore(s.score), 0);
  return String((100000 - sum) / 100);
};

export default function MatchForm({ tournamentId, players, matchCounts, maxRound }: Props) {
  const [roundNumber, setRoundNumber] = useState("");
  const [tableName, setTableName] = useState("");
  const [slots, setSlots] = useState<PlayerSlot[]>([EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT].map(s => ({ ...s })));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateSlot = (index: number, field: keyof PlayerSlot, value: string) => {
    setSlots((prev) => {
      const next = prev.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      if (field === "score" && index < 3) {
        const auto = calcLastScore(next);
        if (auto !== "") next[3] = { ...next[3], score: auto };
      }
      return next;
    });
  };

  const validate = (): string | null => {
    if (!roundNumber.trim()) return "回戦番号を入力してください";
    if (!tableName.trim()) return "卓名を入力してください";
    for (let i = 0; i < 4; i++) {
      if (!slots[i].playerId) return `${i + 1}人目のプレイヤーを選択してください`;
      if (slots[i].score === "") return `${i + 1}人目の点数を入力してください`;
      if (isNaN(Number(slots[i].score))) return `${i + 1}人目の点数は数値で入力してください`;
    }
    if (new Set(slots.map((s) => s.playerId)).size !== 4) return "同じプレイヤーを重複して選択できません";
    return null;
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    const total = slots.reduce((sum, s) => sum + toActualScore(s.score), 0);
    if (total !== 100000) {
      setError(`点数合計が ${total.toLocaleString()} 点です（合計100,000点になるように修正してください）`);
      return;
    }
    setSaving(true);
    try {
      const inputs = slots.map((s) => {
        const player = players.find((p) => p.id === s.playerId)!;
        return { playerId: s.playerId, playerName: player.name, score: toActualScore(s.score) };
      });
      await saveMatch(tournamentId, Number(roundNumber), tableName.trim(), inputs);
      setSlots([EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT].map(s => ({ ...s })));
      setRoundNumber("");
      setTableName("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const selectedIds = slots.map((s) => s.playerId).filter(Boolean);
  const autoLastScore = calcLastScore(slots);

  const inputStyle = { border: "1px solid var(--hairline)", background: "var(--canvas)" };
  const selectStyle = { border: "1px solid var(--hairline)", background: "var(--canvas)" };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>対局結果入力</h2>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>回戦</label>
          <select
            value={roundNumber}
            onChange={(e) => setRoundNumber(e.target.value)}
            className="rounded-lg px-3 py-3 text-lg w-full"
            style={selectStyle}
          >
            <option value="">選択</option>
            {Array.from({ length: maxRound + 1 }, (_, i) => maxRound + 1 - i).map((n) => (
              <option key={n} value={n}>第{n}回戦</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>卓名</label>
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="例: A卓"
            className="rounded-lg px-3 py-3 text-lg w-full"
            style={inputStyle}
          />
        </div>
      </div>

      {slots.map((slot, i) => {
        const isAutoFilled = i === 3 && autoLastScore !== "" && slot.score === autoLastScore;
        return (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-base font-medium w-6" style={{ color: "var(--muted)" }}>{i + 1}</span>
            <select
              value={slot.playerId}
              onChange={(e) => updateSlot(i, "playerId", e.target.value)}
              className="rounded-lg px-3 py-3 text-lg flex-1"
              style={selectStyle}
            >
              <option value="">プレイヤーを選択</option>
              {players
                .filter((p) => !selectedIds.includes(p.id) || p.id === slot.playerId)
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
                className="rounded-lg px-3 py-3 text-lg w-24 text-right"
                style={{
                  border: `1px solid ${isAutoFilled ? "var(--accent-teal)" : "var(--hairline)"}`,
                  background: isAutoFilled ? "#f0faf8" : "var(--canvas)",
                }}
              />
              <span className="text-lg font-semibold select-none" style={{ color: "var(--muted)" }}>00</span>
            </div>
          </div>
        );
      })}

      {error && <p className="font-medium" style={{ color: "var(--error)" }}>{error}</p>}
      {success && <p className="font-medium" style={{ color: "var(--success)" }}>保存しました！</p>}

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
