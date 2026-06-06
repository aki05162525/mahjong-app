"use client";

import { useState } from "react";
import { validateRule } from "@/lib/ruleValidation";

export type RuleFormValues = {
  name: string;
  uma: number[];
  returnPoints: number;
  isDefault: boolean;
};

type Props = {
  initial?: RuleFormValues;
  submitLabel: string;
  onSubmit: (values: RuleFormValues) => Promise<string | null>; // 失敗時はエラーメッセージ
  onCancel?: () => void;
};

// ウマのクイック入力候補（「○-○」表記で統一）
const UMA_PRESETS: { label: string; uma: number[] }[] = [
  { label: "10-30", uma: [30, 10, -10, -30] },
  { label: "10-20", uma: [20, 10, -10, -20] },
  { label: "5-10", uma: [10, 5, -5, -10] },
  { label: "なし", uma: [0, 0, 0, 0] },
];
const RETURN_PRESETS = [30000, 25000];

const DEFAULT_VALUES: RuleFormValues = {
  name: "",
  uma: [20, 10, -10, -20],
  returnPoints: 30000,
  isDefault: false,
};

const RANKS = ["1位", "2位", "3位", "4位"] as const;

export default function RuleForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? DEFAULT_VALUES.name);
  const [uma, setUma] = useState<string[]>(
    (initial?.uma ?? DEFAULT_VALUES.uma).map((u) => String(u))
  );
  const [returnPoints, setReturnPoints] = useState(
    String(initial?.returnPoints ?? DEFAULT_VALUES.returnPoints)
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? DEFAULT_VALUES.isDefault);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setUmaAt = (i: number, v: string) =>
    setUma((prev) => prev.map((u, idx) => (idx === i ? v : u)));

  const handleSubmit = async () => {
    const parsedUma = uma.map((u) => Number(u));
    const parsedReturn = Number(returnPoints);
    const values: RuleFormValues = {
      name: name.trim(),
      uma: parsedUma,
      returnPoints: parsedReturn,
      isDefault,
    };

    const validationError = validateRule(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    const submitError = await onSubmit(values);
    setSaving(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    // 追加モード（onCancel なし）では入力をリセット
    if (!onCancel) {
      setName("");
      setUma(DEFAULT_VALUES.uma.map((u) => String(u)));
      setReturnPoints(String(DEFAULT_VALUES.returnPoints));
      setIsDefault(false);
    }
  };

  const inputStyle = { border: "1px solid var(--hairline)", background: "var(--canvas)" };
  const chipStyle = { color: "var(--primary)", border: "1px solid var(--primary)" };
  const umaSum = uma.reduce((s, u) => s + (Number(u) || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          ルール名
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 10-30（オカ30000）"
          className="rounded-lg px-3 py-3 text-lg"
          style={inputStyle}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          ウマ（順位点・合計0）
        </label>
        <div className="flex flex-wrap gap-2">
          {UMA_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setUma(p.uma.map((u) => String(u)))}
              className="text-sm rounded-lg px-3 py-1 active:opacity-70"
              style={chipStyle}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {uma.map((u, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {RANKS[i]}
              </span>
              <input
                type="number"
                value={u}
                onChange={(e) => setUmaAt(i, e.target.value)}
                className="rounded-lg px-2 py-2 text-base w-full text-center"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
        <span className="text-xs" style={{ color: umaSum === 0 ? "var(--muted)" : "var(--error)" }}>
          合計: {umaSum}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          オカ（持ち点25000）
        </label>
        <div className="flex flex-wrap gap-2">
          {RETURN_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReturnPoints(String(r))}
              className="text-sm rounded-lg px-3 py-1 active:opacity-70"
              style={chipStyle}
            >
              {r.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={returnPoints}
          onChange={(e) => setReturnPoints(e.target.value)}
          className="rounded-lg px-3 py-3 text-lg w-40"
          style={inputStyle}
        />
      </div>

      <label className="flex items-center gap-2 text-base" style={{ color: "var(--body)" }}>
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-5 h-5"
        />
        この大会のデフォルトにする
      </label>

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg px-5 py-3 text-lg font-semibold active:opacity-80 disabled:opacity-50"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          {saving ? "保存中..." : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg px-5 py-3 text-base active:opacity-70"
            style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}
