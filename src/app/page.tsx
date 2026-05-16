"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TopPage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [newName, setNewName] = useState("");
  const [customId, setCustomId] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = () => {
    const id = joinId.trim();
    if (!id) {
      setError("大会IDを入力してください");
      return;
    }
    router.push(`/${id}`);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError("大会名を入力してください");
      return;
    }
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/create-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          customId: customId.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "大会の作成に失敗しました");
        setCreating(false);
        return;
      }
      router.push(`/${data.id}`);
    } catch {
      setError("大会の作成に失敗しました");
      setCreating(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-10">
      <h1 className="text-3xl font-bold text-center">🀄 小次郎麻雀大会スコア</h1>

      {error && <p className="text-red-600 font-medium">{error}</p>}

      {/* 大会に参加 */}
      <section className="w-full max-w-sm flex flex-col gap-3 border rounded-xl p-6 shadow">
        <h2 className="text-xl font-semibold">大会IDで参加</h2>
        <input
          type="text"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="大会IDを入力"
          className="border rounded-lg px-4 py-3 text-lg w-full"
        />
        <button
          onClick={handleJoin}
          className="bg-blue-600 text-white rounded-lg px-4 py-3 text-lg font-semibold w-full active:opacity-80"
        >
          大会ページへ
        </button>
      </section>

      {/* 新しい大会を作成 */}
      <section className="w-full max-w-sm flex flex-col gap-3 border rounded-xl p-6 shadow">
        <h2 className="text-xl font-semibold">新しい大会を作成</h2>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="大会名（例: 第1回麻雀大会）"
          className="border rounded-lg px-4 py-3 text-lg w-full"
        />
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="大会ID・任意（例: mahjong2025）"
            className="border rounded-lg px-4 py-3 text-lg w-full"
          />
          <p className="text-xs text-gray-400">空欄の場合は自動生成。英数字・ハイフン・アンダースコアのみ</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="管理者パスワード"
          className="border rounded-lg px-4 py-3 text-lg w-full"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="bg-green-600 text-white rounded-lg px-4 py-3 text-lg font-semibold w-full active:opacity-80 disabled:opacity-50"
        >
          {creating ? "作成中..." : "大会を作成"}
        </button>
      </section>
    </main>
  );
}
