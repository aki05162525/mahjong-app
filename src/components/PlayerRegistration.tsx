"use client";

import { useState } from "react";
import { addPlayer } from "@/lib/firestore";
import type { Player } from "@/lib/firestore";

type Props = {
  tournamentId: string;
  players: Player[];
};

export default function PlayerRegistration({ tournamentId, players }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名前を入力してください");
      return;
    }
    if (players.some((p) => p.name === trimmed)) {
      setError("同じ名前のプレイヤーが既に存在します");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addPlayer(tournamentId, trimmed);
      setName("");
    } catch {
      setError("登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">プレイヤー登録</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="プレイヤー名"
          className="border rounded-lg px-4 py-3 text-lg flex-1"
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-green-600 text-white rounded-lg px-5 py-3 text-lg font-semibold active:opacity-80 disabled:opacity-50"
        >
          追加
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <ul className="flex flex-wrap gap-2">
        {players.map((p) => (
          <li key={p.id} className="bg-gray-100 rounded-full px-4 py-2 text-base">
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
