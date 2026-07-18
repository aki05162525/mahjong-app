"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { usePlayers } from "@/hooks/usePlayers";
import { useTables } from "@/hooks/useTables";
import { useRules } from "@/hooks/useRules";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/hooks/useAuth";
import TournamentTabs from "@/components/TournamentTabs";

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament, notFound } = useTournament(tournamentId);
  const { players } = usePlayers(tournamentId);
  const { tables } = useTables(tournamentId);
  const { rules } = useRules(tournamentId);
  const { matches, ranking } = useMatches(tournamentId);
  const { user } = useAuth();

  const isOwner = !!user && !!tournament && user.id === tournament.ownerId;

  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/delete-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "削除に失敗しました");
        setDeleting(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setDeleteError("削除に失敗しました");
      setDeleting(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (notFound) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <p className="text-xl" style={{ color: "var(--body)" }}>
          大会が見つかりませんでした
        </p>
        <Link href="/" className="underline text-lg" style={{ color: "var(--primary)" }}>
          トップへ戻る
        </Link>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-lg" style={{ color: "var(--muted)" }}>
          読み込み中...
        </p>
      </main>
    );
  }

  return (
    // ランキング表（10列）が収まるよう PC ではコンテナを広げる。スマホは従来どおり
    <div className="w-full max-w-2xl lg:max-w-4xl mx-auto flex flex-col min-h-screen overflow-x-hidden">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-2 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href="/" className="text-sm shrink-0 pt-1" style={{ color: "var(--primary)" }}>
            ← トップ
          </Link>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={handleCopyUrl}
              className="text-sm rounded-lg px-3 py-1 active:opacity-70"
              style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
            >
              {copied ? "コピー済み！" : "URLをコピー"}
            </button>
            {isOwner && (
              <>
                <Link
                  href={`/${tournamentId}/players`}
                  className="text-sm rounded-lg px-3 py-1 active:opacity-70"
                  style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
                >
                  選手管理 ({players.length})
                </Link>
                <Link
                  href={`/${tournamentId}/rules`}
                  className="text-sm rounded-lg px-3 py-1 active:opacity-70"
                  style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
                >
                  ルール管理 ({rules.length})
                </Link>
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setDeleteError("");
                  }}
                  className="text-sm rounded-lg px-3 py-1 active:opacity-70"
                  style={{ color: "var(--error)", border: "1px solid var(--error)" }}
                >
                  大会削除
                </button>
              </>
            )}
          </div>
        </div>
        <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
          {tournament.name}
        </h1>
      </div>

      {/* 削除モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div
            className="rounded-xl p-6 w-full max-w-sm flex flex-col gap-4"
            style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
          >
            <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              大会を削除
            </h2>
            <p className="text-sm" style={{ color: "var(--body)" }}>
              「{tournament.name}」を削除します。プレイヤー・対局履歴も全て消えます。
            </p>
            {deleteError && (
              <p className="text-sm" style={{ color: "var(--error)" }}>
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg py-3 text-base active:opacity-70"
                style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg py-3 text-base font-semibold active:opacity-70 disabled:opacity-50"
                style={{ background: "var(--error)", color: "#fff" }}
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TournamentTabs
        tournamentId={tournamentId}
        players={players}
        tables={tables}
        rules={rules}
        matches={matches}
        ranking={ranking}
        isOwner={isOwner}
      />
    </div>
  );
}
