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
import { loadWriteToken, saveWriteToken, buildRecordUrl } from "@/lib/recordToken";
import MatchHistory from "@/components/MatchHistory";
import Ranking from "@/components/Ranking";

type Tab = "ranking" | "history";

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament, notFound } = useTournament(tournamentId);
  const { players } = usePlayers(tournamentId);
  const { tables } = useTables(tournamentId);
  const { rules } = useRules(tournamentId);
  const { matches, ranking } = useMatches(tournamentId);
  const { user } = useAuth();

  const isOwner = !!user && !!tournament && user.id === tournament.ownerId;

  const [tab, setTab] = useState<Tab>("ranking");
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareIssuing, setShareIssuing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

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

  const handleOpenShare = () => {
    setShowShareModal(true);
    setShareError("");
    setShareCopied(false);
    // raw トークンは再表示不可。作成時に退避したものが手元にあればそれでリンクを作る
    const stored = loadWriteToken(tournamentId);
    setShareUrl(stored ? buildRecordUrl(window.location.origin, tournamentId, stored) : "");
  };

  // トークンを紛失している場合の再発行。旧リンクは失効する
  const handleReissue = async () => {
    setShareIssuing(true);
    setShareError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/write-token`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setShareError(data.error ?? "記録用リンクの発行に失敗しました");
        return;
      }
      saveWriteToken(tournamentId, data.writeToken);
      setShareUrl(buildRecordUrl(window.location.origin, tournamentId, data.writeToken));
    } catch {
      setShareError("記録用リンクの発行に失敗しました");
    } finally {
      setShareIssuing(false);
    }
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "ranking", label: "ランキング" },
    { key: "history", label: "履歴" },
  ];

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-screen overflow-x-hidden">
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
                <button
                  onClick={handleOpenShare}
                  className="text-sm rounded-lg px-3 py-1 active:opacity-70"
                  style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                >
                  記録リンクを共有
                </button>
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

      {/* 記録リンク共有モーダル */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div
            className="rounded-xl p-6 w-full max-w-sm flex flex-col gap-4"
            style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
          >
            <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              記録リンクを共有
            </h2>
            {shareUrl ? (
              <>
                <p className="text-sm" style={{ color: "var(--body)" }}>
                  このリンクを開いた人は誰でもこの大会の対局結果を記録できます。記録係にだけ渡してください。
                </p>
                <p
                  className="text-xs break-all rounded-lg p-3 font-mono"
                  style={{ background: "var(--canvas)", border: "1px solid var(--hairline)" }}
                >
                  {shareUrl}
                </p>
                <button
                  onClick={handleCopyShareUrl}
                  className="rounded-lg py-3 text-base font-semibold active:opacity-80"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {shareCopied ? "コピーしました！" : "リンクをコピー"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--body)" }}>
                  記録用リンクはこの端末に残っていません。新しいリンクを発行すると、いま配られているリンクは使えなくなります。
                </p>
                {shareError && (
                  <p className="text-sm" style={{ color: "var(--error)" }}>
                    {shareError}
                  </p>
                )}
                <button
                  onClick={handleReissue}
                  disabled={shareIssuing}
                  className="rounded-lg py-3 text-base font-semibold active:opacity-80 disabled:opacity-50"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {shareIssuing ? "発行中..." : "新しいリンクを発行"}
                </button>
              </>
            )}
            <button
              onClick={() => setShowShareModal(false)}
              className="rounded-lg py-3 text-base active:opacity-70"
              style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* タブ */}
      <div
        className="flex sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--hairline)", background: "var(--canvas)" }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-3 text-base font-semibold border-b-2 transition-colors"
            style={{
              borderBottomColor: tab === key ? "var(--primary)" : "transparent",
              color: tab === key ? "var(--primary)" : "var(--muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* コンテンツ（閲覧専用。記録は /record/[tournamentId] で行う） */}
      <div className="px-4 py-6 flex-1">
        {tab === "ranking" && <Ranking ranking={ranking} />}

        {tab === "history" && (
          <MatchHistory matches={matches} isOwner={isOwner} showTable={tables.length >= 2} />
        )}
      </div>
    </div>
  );
}
