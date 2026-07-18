"use client";

import { useRef, useState } from "react";
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

  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // popover は top layer に出るため CSS だけではボタン基準に置けない（anchor positioning は
  // まだ全ブラウザに届いていない）。開いた瞬間にボタンの位置から右揃えで座標を与える。
  const positionMenu = () => {
    const menu = menuRef.current;
    const button = menuButtonRef.current;
    if (!menu || !button) return;
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
  };

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
          <Link href="/" className="shrink-0 pt-1 text-sm text-primary hover:underline">
            ← トップ
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleCopyUrl}
              className="rounded-lg border border-primary px-3 py-1 text-sm text-primary transition-colors hover:bg-surface-soft active:opacity-70"
            >
              {copied ? "コピー済み！" : "URLをコピー"}
            </button>
            {isOwner && (
              <>
                <button
                  ref={menuButtonRef}
                  popoverTarget="owner-menu"
                  aria-label="大会の管理"
                  className="rounded-lg border border-hairline px-3 py-1 text-sm text-muted transition-colors hover:bg-surface-soft hover:text-ink active:opacity-70"
                >
                  ⋯
                </button>
                <div
                  id="owner-menu"
                  ref={menuRef}
                  popover="auto"
                  onToggle={(e) => {
                    if (e.newState === "open") positionMenu();
                  }}
                  className="inset-auto m-0 w-52 rounded-xl border border-hairline bg-surface-card p-1 shadow-lg"
                >
                  <Link
                    href={`/${tournamentId}/players`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-body transition-colors hover:bg-surface-soft"
                  >
                    選手管理
                    <span className="text-xs text-muted">{players.length}人</span>
                  </Link>
                  <Link
                    href={`/${tournamentId}/rules`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-body transition-colors hover:bg-surface-soft"
                  >
                    ルール管理
                    <span className="text-xs text-muted">{rules.length}件</span>
                  </Link>
                  <hr className="my-1 border-hairline" />
                  <button
                    onClick={() => {
                      menuRef.current?.hidePopover();
                      setShowDeleteModal(true);
                      setDeleteError("");
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-error transition-colors hover:bg-error/10"
                  >
                    大会を削除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <h1 className="text-xl font-bold text-ink">{tournament.name}</h1>
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
