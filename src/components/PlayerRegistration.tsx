"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Player } from "@/lib/types";

type Props = {
  tournamentId: string;
  players: Player[];
  isOwner?: boolean;
  onChange?: () => void | PromiseLike<void>;
};

export default function PlayerRegistration({
  tournamentId,
  players,
  isOwner = false,
  onChange,
}: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [optimisticPlayers, addOptimisticPlayer] = useOptimistic(
    players,
    (current, name: string) => [
      ...current,
      { id: `optimistic-${name}`, name, createdAt: new Date() },
    ]
  );

  // 再取得（onChange）は成功した書き込みを画面へ反映するだけのベストエフォート。
  // 失敗しても書き込み自体は成功しているので、mutation の成否には含めず握りつぶす。
  const refresh = async () => {
    try {
      await onChange?.();
    } catch {
      // 再取得失敗はビューの一時的なずれのみ。Realtime か次の操作で収束する。
    }
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名前を入力してください");
      return;
    }
    if (optimisticPlayers.some((p) => p.name === trimmed)) {
      setError("同じ名前のプレイヤーが既に存在します");
      return;
    }
    setName("");
    setError("");
    startTransition(async () => {
      // 楽観的に画面へ反映。transition が終わると players（本物）に巻き戻る。
      addOptimisticPlayer(trimmed);
      try {
        const res = await fetch("/api/players", {
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
      } catch {
        setError("登録に失敗しました");
        setName(trimmed);
        return;
      }
      // 登録成功。本物の players が trimmed を含むまで待ってから transition を終える（チラつき防止）。
      await refresh();
    });
  };

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setEditingName(player.name);
    setError("");
  };

  const handleRename = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("名前を入力してください");
      return;
    }
    if (optimisticPlayers.some((p) => p.name === trimmed && p.id !== editingId)) {
      setError("同じ名前のプレイヤーが既に存在します");
      return;
    }
    setRenaming(true);
    setError("");
    try {
      const res = await fetch(`/api/players/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "変更に失敗しました");
        return;
      }
    } catch {
      setError("変更に失敗しました");
      return;
    } finally {
      setRenaming(false);
    }
    setEditingId(null);
    await refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
        プレイヤー登録
      </h2>
      {isOwner && (
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="プレイヤー名"
            className="rounded-lg px-4 py-3 text-lg flex-1 min-w-0"
            style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
          />
          <button
            onClick={handleAdd}
            className="rounded-lg px-5 py-3 text-lg font-semibold active:opacity-80 shrink-0"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            追加
          </button>
        </div>
      )}
      {error && <p style={{ color: "var(--error)" }}>{error}</p>}
      <ul className="flex flex-col gap-2">
        {optimisticPlayers.map((p) =>
          isOwner && editingId === p.id ? (
            <li key={p.id} className="flex gap-2 items-center">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
                className="rounded-lg px-3 py-2 text-base flex-1 min-w-0"
                style={{ border: "1px solid var(--primary)", background: "var(--canvas)" }}
              />
              <button
                onClick={handleRename}
                disabled={renaming}
                className="rounded-lg px-3 py-2 text-sm font-semibold active:opacity-80 disabled:opacity-50 shrink-0"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {renaming ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg px-3 py-2 text-sm active:opacity-70 shrink-0"
                style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
              >
                キャンセル
              </button>
            </li>
          ) : (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-full px-4 py-2 text-base"
              style={{ background: "var(--surface-strong)", color: "var(--body)" }}
            >
              <span className="min-w-0 truncate">{p.name}</span>
              {isOwner && !p.id.startsWith("optimistic-") && (
                <button
                  onClick={() => startEdit(p)}
                  className="text-xs active:opacity-70 ml-2 shrink-0"
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
