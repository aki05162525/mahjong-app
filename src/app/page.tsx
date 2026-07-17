"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/infra/supabase";
import { saveWriteToken } from "@/lib/recordToken";
import type { Tournament } from "@/lib/types";

export default function TopPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const [joinId, setJoinId] = useState("");
  const [newName, setNewName] = useState("");
  const [customId, setCustomId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [tournamentCache, setTournamentCache] = useState<{
    userId: string;
    list: Tournament[];
  } | null>(null);
  const myTournaments =
    tournamentCache !== null && tournamentCache.userId === user?.id ? tournamentCache.list : [];

  useEffect(() => {
    if (!user) return;
    let aborted = false;
    supabase
      .from("tournaments")
      .select("id, name, created_at, owner_id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (aborted || !data) return;
        setTournamentCache({
          userId: user.id,
          list: data.map((t) => ({
            id: t.id,
            name: t.name,
            createdAt: new Date(t.created_at),
            ownerId: t.owner_id,
          })),
        });
      });
    return () => {
      aborted = true;
    };
  }, [user]);

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
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/create-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          customId: customId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "大会の作成に失敗しました");
        setCreating(false);
        return;
      }
      // 記録トークンの raw はこのレスポンスでしか受け取れない（再表示不可）。
      // 「記録リンクを共有」で使えるように退避しておく
      if (data.writeToken) saveWriteToken(data.id, data.writeToken);
      router.push(`/${data.id}`);
    } catch {
      setError("大会の作成に失敗しました");
      setCreating(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-10">
      <h1 className="text-3xl font-bold text-center" style={{ color: "var(--ink)" }}>
        🀄 小次郎麻雀大会スコア
      </h1>

      {error && (
        <p className="font-medium" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      {/* 大会に参加 */}
      <section
        className="w-full max-w-sm flex flex-col gap-3 rounded-xl p-6 shadow-sm"
        style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
      >
        <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
          大会IDで参加
        </h2>
        <input
          type="text"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="大会IDを入力"
          className="rounded-lg px-4 py-3 text-lg w-full"
          style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
        />
        <button
          onClick={handleJoin}
          className="rounded-lg px-4 py-3 text-lg font-semibold w-full active:opacity-80"
          style={{ background: "var(--accent-teal)", color: "#fff" }}
        >
          大会ページへ
        </button>
      </section>

      {/* ログイン済み: 大会作成 + マイ大会 */}
      {!loading && user ? (
        <>
          <section
            className="w-full max-w-sm flex flex-col gap-3 rounded-xl p-6 shadow-sm"
            style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
                新しい大会を作成
              </h2>
              <button
                onClick={() => signOut()}
                className="text-sm active:opacity-70"
                style={{ color: "var(--muted)" }}
              >
                ログアウト
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="大会名（例: 第1回麻雀大会）"
              className="rounded-lg px-4 py-3 text-lg w-full"
              style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
            />
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="大会ID・任意（例: mahjong2025）"
                className="rounded-lg px-4 py-3 text-lg w-full"
                style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
              />
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                空欄の場合は自動生成。英数字・ハイフン・アンダースコアのみ
              </p>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg px-4 py-3 text-lg font-semibold w-full active:opacity-80 disabled:opacity-50"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {creating ? "作成中..." : "大会を作成"}
            </button>
          </section>

          {myTournaments.length > 0 && (
            <section className="w-full max-w-sm flex flex-col gap-3">
              <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
                自分の大会
              </h2>
              <ul className="flex flex-col gap-2">
                {myTournaments.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => router.push(`/${t.id}`)}
                      className="w-full text-left rounded-xl px-4 py-3 active:opacity-80"
                      style={{
                        background: "var(--surface-card)",
                        border: "1px solid var(--hairline)",
                      }}
                    >
                      <p className="font-semibold" style={{ color: "var(--ink)" }}>
                        {t.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        ID: {t.id}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : !loading ? (
        /* 未ログイン: Googleログインボタン */
        <section
          className="w-full max-w-sm flex flex-col gap-3 rounded-xl p-6 shadow-sm"
          style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
        >
          <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
            新しい大会を作成
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            大会を作成・管理するにはGoogleアカウントでログインしてください
          </p>
          <button
            onClick={() => signInWithGoogle()}
            className="rounded-lg px-4 py-3 text-lg font-semibold w-full active:opacity-80 flex items-center justify-center gap-2"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            Googleでログインして大会を作る
          </button>
        </section>
      ) : null}
    </main>
  );
}
