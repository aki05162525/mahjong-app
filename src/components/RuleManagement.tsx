"use client";

import { useState } from "react";
import type { Rule } from "@/lib/types";
import { formatUma } from "@/lib/formatUma";
import RuleForm, { type RuleFormValues } from "./RuleForm";

type Props = {
  tournamentId: string;
  rules: Rule[];
  isOwner?: boolean;
  onChange?: () => void | PromiseLike<void>;
};

export default function RuleManagement({ tournamentId, rules, isOwner = false, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // 再取得（onChange）は「成功した書き込みを画面に反映する」だけのベストエフォート。
  // ここが失敗しても書き込み自体は成功しているので、mutation の成否には含めない。
  const refresh = async () => {
    try {
      await onChange?.();
    } catch {
      // 再取得失敗はビューの一時的なずれのみ。Realtime か次の操作で収束する。
    }
  };

  const create = async (values: RuleFormValues): Promise<string | null> => {
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, ...values }),
      });
      if (!res.ok) return (await res.json()).error ?? "作成に失敗しました";
    } catch {
      return "作成に失敗しました";
    }
    await refresh();
    return null;
  };

  const update = async (id: string, values: RuleFormValues): Promise<string | null> => {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) return (await res.json()).error ?? "変更に失敗しました";
    } catch {
      return "変更に失敗しました";
    }
    // 新デフォルト設定時は旧デフォルト行も is_default=false に変わるので、全件取り直す。
    await refresh();
    setEditingId(null);
    return null;
  };

  const remove = async (id: string) => {
    setError("");
    setDeletingId(id);
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError((await res.json()).error ?? "削除に失敗しました");
        return;
      }
    } catch {
      setError("削除に失敗しました");
      return;
    } finally {
      setDeletingId(null);
    }
    await refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
        ルール管理
      </h2>

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}

      <ul className="flex flex-col gap-2">
        {rules.map((rule) =>
          isOwner && editingId === rule.id ? (
            <li
              key={rule.id}
              className="rounded-xl p-3"
              style={{ border: "1px solid var(--primary)" }}
            >
              <RuleForm
                initial={{
                  name: rule.name,
                  uma: rule.uma,
                  returnPoints: rule.returnPoints,
                  isDefault: rule.isDefault,
                }}
                submitLabel="保存"
                onSubmit={(values) => update(rule.id, values)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={rule.id}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "var(--surface-strong)", color: "var(--body)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-medium flex items-center gap-2">
                  {rule.name}
                  {rule.isDefault && (
                    <span
                      className="text-xs rounded px-1.5 py-0.5"
                      style={{ background: "var(--primary)", color: "#fff" }}
                    >
                      デフォルト
                    </span>
                  )}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  ウマ {formatUma(rule.uma)} オカ {rule.returnPoints.toLocaleString()}
                </span>
              </div>
              {isOwner && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingId(rule.id);
                      setError("");
                    }}
                    className="text-xs active:opacity-70"
                    style={{ color: "var(--muted)" }}
                  >
                    編集
                  </button>
                  {!rule.isDefault && (
                    <button
                      onClick={() => remove(rule.id)}
                      disabled={deletingId === rule.id}
                      className="text-xs active:opacity-70 disabled:opacity-40"
                      style={{ color: "var(--error)" }}
                    >
                      {deletingId === rule.id ? "削除中..." : "削除"}
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        )}
      </ul>

      {isOwner && (
        <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "1rem" }}>
          <h3 className="text-base font-semibold mb-2" style={{ color: "var(--body)" }}>
            ルールを追加
          </h3>
          <RuleForm submitLabel="追加" onSubmit={create} />
        </div>
      )}
    </div>
  );
}
