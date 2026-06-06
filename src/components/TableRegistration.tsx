"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Table } from "@/lib/types";

type Props = {
  tournamentId: string;
  tables: Table[];
  isOwner?: boolean;
  onChange?: () => void | PromiseLike<void>;
};

export default function TableRegistration({
  tournamentId,
  tables,
  isOwner = false,
  onChange,
}: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [optimisticTables, addOptimisticTable] = useOptimistic(tables, (current, name: string) => [
    ...current,
    { id: `optimistic-${name}`, name, createdAt: new Date() },
  ]);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("卓名を入力してください");
      return;
    }
    if (optimisticTables.some((t) => t.name === trimmed)) {
      setError("同じ名前の卓が既に存在します");
      return;
    }
    setName("");
    setError("");
    startTransition(async () => {
      // 楽観的に画面へ反映。transition が終わると tables（本物）に巻き戻る。
      addOptimisticTable(trimmed);
      try {
        const res = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId, name: trimmed }),
        });
        if (!res.ok) {
          // 巻き戻りで楽観行は消える。入力を戻して再編集できるようにする。
          setError((await res.json()).error ?? "登録に失敗しました");
          setName(trimmed);
          return;
        }
        // 本物の tables が trimmed を含むまで待ってから transition を終える（チラつき防止）。
        await onChange?.();
      } catch {
        setError("登録に失敗しました");
        setName(trimmed);
      }
    });
  };

  const startEdit = (table: Table) => {
    setEditingId(table.id);
    setEditingName(table.name);
    setError("");
  };

  const handleRename = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("卓名を入力してください");
      return;
    }
    if (optimisticTables.some((t) => t.name === trimmed && t.id !== editingId)) {
      setError("同じ名前の卓が既に存在します");
      return;
    }
    setRenaming(true);
    setError("");
    try {
      const res = await fetch(`/api/tables/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "変更に失敗しました");
        return;
      }
      setEditingId(null);
      onChange?.();
    } catch {
      setError("変更に失敗しました");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
          卓登録
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          複数卓に分けて同時進行する場合のみ登録します。1卓だけなら登録は不要です。
        </p>
      </div>
      {isOwner && (
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="卓名（例: A卓）"
            className="rounded-lg px-4 py-3 text-lg flex-1"
            style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
          />
          <button
            onClick={handleAdd}
            className="rounded-lg px-5 py-3 text-lg font-semibold active:opacity-80"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            追加
          </button>
        </div>
      )}
      {error && <p style={{ color: "var(--error)" }}>{error}</p>}
      <ul className="flex flex-col gap-2">
        {optimisticTables.map((t) =>
          isOwner && editingId === t.id ? (
            <li key={t.id} className="flex gap-2 items-center">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
                className="rounded-lg px-3 py-2 text-base flex-1"
                style={{ border: "1px solid var(--primary)", background: "var(--canvas)" }}
              />
              <button
                onClick={handleRename}
                disabled={renaming}
                className="rounded-lg px-3 py-2 text-sm font-semibold active:opacity-80 disabled:opacity-50"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {renaming ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg px-3 py-2 text-sm active:opacity-70"
                style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
              >
                キャンセル
              </button>
            </li>
          ) : (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-full px-4 py-2 text-base"
              style={{ background: "var(--surface-strong)", color: "var(--body)" }}
            >
              <span>{t.name}</span>
              {isOwner && !t.id.startsWith("optimistic-") && (
                <button
                  onClick={() => startEdit(t)}
                  className="text-xs active:opacity-70 ml-2"
                  style={{ color: "var(--muted)" }}
                >
                  編集
                </button>
              )}
            </li>
          )
        )}
      </ul>
    </div>
  );
}
