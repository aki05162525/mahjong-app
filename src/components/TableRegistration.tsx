"use client";

import { useState } from "react";
import { addTable } from "@/lib/firestore";
import type { Table } from "@/lib/firestore";

type Props = {
  tournamentId: string;
  tables: Table[];
};

export default function TableRegistration({ tournamentId, tables }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("卓名を入力してください"); return; }
    if (tables.some((t) => t.name === trimmed)) { setError("同じ名前の卓が既に存在します"); return; }
    setSaving(true);
    setError("");
    try {
      await addTable(tournamentId, trimmed);
      setName("");
    } catch {
      setError("登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>卓登録</h2>
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
          disabled={saving}
          className="rounded-lg px-5 py-3 text-lg font-semibold active:opacity-80 disabled:opacity-50"
          style={{ background: "var(--primary)", color: "#fff" }}
        >
          追加
        </button>
      </div>
      {error && <p style={{ color: "var(--error)" }}>{error}</p>}
      <ul className="flex flex-wrap gap-2">
        {tables.map((t) => (
          <li key={t.id} className="rounded-full px-4 py-2 text-base" style={{ background: "var(--surface-strong)", color: "var(--body)" }}>
            {t.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
