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
  // 大会に既にあるルール名（編集中の自分自身は除く）。
  // 同名プリセットを重複追加できないよう選択肢から外すために使う。
  existingNames?: string[];
  submitLabel: string;
  onSubmit: (values: RuleFormValues) => Promise<string | null>; // 失敗時はエラーメッセージ
  onCancel?: () => void;
};

// 大会作成画面の「ルール」ステップと同じ、カードで選ぶ方式のプリセット
const PRESETS = [
  { name: "10-20（ワンツー）", uma: [20, 10, -10, -20], returnPoints: 30000 },
  { name: "Mリーグルール", uma: [30, 10, -10, -30], returnPoints: 30000 },
  { name: "5-10", uma: [10, 5, -5, -10], returnPoints: 30000 },
];

const describePreset = (preset: { uma: number[]; returnPoints: number }) =>
  `ウマ ${preset.uma.join(" / ")}・返し ${preset.returnPoints.toLocaleString()}点`;

const CUSTOM = "custom";

export default function RuleForm({
  initial,
  existingNames = [],
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const groupId = useId();
  const presets = PRESETS.filter((preset) => !existingNames.includes(preset.name));

  const [choice, setChoice] = useState(() => {
    if (!initial) return presets[0]?.name ?? CUSTOM;
    const matched = presets.find(
      (preset) =>
        preset.name === initial.name &&
        preset.returnPoints === initial.returnPoints &&
        preset.uma.length === initial.uma.length &&
        preset.uma.every((u, i) => u === initial.uma[i])
    );
    return matched?.name ?? CUSTOM;
  });
  const [customName, setCustomName] = useState(initial?.name ?? "");
  const [customUma, setCustomUma] = useState<string[]>(
    (initial?.uma ?? [20, 10, -10, -20]).map((u) => String(u))
  );
  const [customReturn, setCustomReturn] = useState(String(initial?.returnPoints ?? 30000));
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setCustomUmaAt = (i: number, v: string) =>
    setCustomUma((prev) => prev.map((u, idx) => (idx === i ? v : u)));

  const selectedPreset = presets.find((preset) => preset.name === choice);

  const handleSubmit = async () => {
    const values: RuleFormValues = selectedPreset
      ? { ...selectedPreset, isDefault }
      : {
          name: customName.trim(),
          uma: customUma.map((u) => Number(u)),
          returnPoints: Number(customReturn),
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
    if (submitError) setError(submitError);
    // 追加成功後の入力リセットは、親が key を変えて再マウントすることで行う
  };

  const inputStyle = { border: "1px solid var(--hairline)", background: "var(--canvas)" };
  const cardStyle = (selected: boolean) => ({
    background: "var(--canvas)",
    border: selected ? "2px solid var(--primary)" : "1px solid var(--hairline)",
  });

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        {presets.map((preset) => {
          const selected = choice === preset.name;
          return (
            <label
              key={preset.name}
              className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer"
              style={cardStyle(selected)}
            >
              <input
                type="radio"
                name={groupId}
                checked={selected}
                onChange={() => setChoice(preset.name)}
                className="mt-1.5"
              />
              <span className="flex flex-col">
                <span className="font-semibold" style={{ color: "var(--ink)" }}>
                  {preset.name}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {describePreset(preset)}
                </span>
              </span>
            </label>
          );
        })}
        <label
          className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer"
          style={cardStyle(!selectedPreset)}
        >
          <input
            type="radio"
            name={groupId}
            checked={!selectedPreset}
            onChange={() => setChoice(CUSTOM)}
            className="mt-1.5"
          />
          <span className="flex flex-col">
            <span className="font-semibold" style={{ color: "var(--ink)" }}>
              自分で設定
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              ウマ・返し点を自由に決める
            </span>
          </span>
        </label>
      </fieldset>

      {!selectedPreset && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${groupId}-name`}
              className="text-sm font-semibold"
              style={{ color: "var(--body)" }}
            >
              ルール名
            </label>
            <input
              id={`${groupId}-name`}
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="例: 社内ルール"
              className="rounded-lg px-4 py-2 w-full"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold" style={{ color: "var(--body)" }}>
              ウマ（1位〜4位・合計0）
            </span>
            <div className="flex gap-2">
              {customUma.map((u, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  value={u}
                  onChange={(e) => setCustomUmaAt(i, e.target.value)}
                  aria-label={`${i + 1}位のウマ`}
                  className="rounded-lg px-2 py-2 w-full min-w-0 text-center"
                  style={inputStyle}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${groupId}-return`}
              className="text-sm font-semibold"
              style={{ color: "var(--body)" }}
            >
              返し点
            </label>
            <input
              id={`${groupId}-return`}
              type="text"
              inputMode="numeric"
              value={customReturn}
              onChange={(e) => setCustomReturn(e.target.value)}
              className="rounded-lg px-4 py-2 w-full"
              style={inputStyle}
            />
          </div>
        </div>
      )}

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
