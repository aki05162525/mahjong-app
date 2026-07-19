"use client";

import { useId, useState } from "react";
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

const DEFAULT_UMA = [20, 10, -10, -20];
const DEFAULT_RETURN = 30000;

export default function RuleForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const fieldId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [uma, setUma] = useState<string[]>((initial?.uma ?? DEFAULT_UMA).map((u) => String(u)));
  const [returnPoints, setReturnPoints] = useState(String(initial?.returnPoints ?? DEFAULT_RETURN));
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setUmaAt = (i: number, v: string) =>
    setUma((prev) => prev.map((u, idx) => (idx === i ? v : u)));

  const handleSubmit = async () => {
    const values: RuleFormValues = {
      name: name.trim(),
      uma: uma.map((u) => Number(u)),
      returnPoints: Number(returnPoints),
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
      setUma(DEFAULT_UMA.map((u) => String(u)));
      setReturnPoints(String(DEFAULT_RETURN));
      setIsDefault(false);
    }
  };

  const inputStyle = { border: "1px solid var(--hairline)", background: "var(--canvas)" };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${fieldId}-name`}
          className="text-sm font-semibold"
          style={{ color: "var(--body)" }}
        >
          ルール名
        </label>
        <input
          id={`${fieldId}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 大会用ルール"
          className="rounded-lg px-4 py-2 w-full"
          style={inputStyle}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold" style={{ color: "var(--body)" }}>
          ウマ（1位〜4位・合計0）
        </span>
        <div className="flex gap-2">
          {uma.map((u, i) => (
            <input
              key={i}
              type="text"
              inputMode="numeric"
              value={u}
              onChange={(e) => setUmaAt(i, e.target.value)}
              aria-label={`${i + 1}位のウマ`}
              className="rounded-lg px-2 py-2 w-full min-w-0 text-center"
              style={inputStyle}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${fieldId}-return`}
          className="text-sm font-semibold"
          style={{ color: "var(--body)" }}
        >
          返し点
        </label>
        <input
          id={`${fieldId}-return`}
          type="text"
          inputMode="numeric"
          value={returnPoints}
          onChange={(e) => setReturnPoints(e.target.value)}
          className="rounded-lg px-4 py-2 w-full"
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
