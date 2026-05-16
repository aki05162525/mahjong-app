"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTournament,
  subscribePlayers,
  subscribeMatches,
  subscribeTables,
  buildRanking,
  type Tournament,
  type Player,
  type Match,
  type RankingEntry,
  type Table,
} from "@/lib/firestore";
import MatchForm from "@/components/MatchForm";
import MatchHistory from "@/components/MatchHistory";
import Ranking from "@/components/Ranking";

type Tab = "ranking" | "input" | "history";

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("input");
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    getTournament(tournamentId).then((t) => {
      if (!t) setNotFound(true);
      else setTournament(t);
    });
  }, [tournamentId]);

  useEffect(() => {
    const unsub = subscribePlayers(tournamentId, setPlayers);
    return unsub;
  }, [tournamentId]);

  useEffect(() => {
    const unsub = subscribeTables(tournamentId, setTables);
    return unsub;
  }, [tournamentId]);

  useEffect(() => {
    const unsub = subscribeMatches(tournamentId, (m) => {
      setMatches(m);
      setRanking(buildRanking(m));
    });
    return unsub;
  }, [tournamentId]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/delete-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, password: deletePassword }),
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
        <p className="text-xl" style={{ color: "var(--body)" }}>大会が見つかりませんでした</p>
        <Link href="/" className="underline text-lg" style={{ color: "var(--primary)" }}>
          トップへ戻る
        </Link>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-lg" style={{ color: "var(--muted)" }}>読み込み中...</p>
      </main>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "input",   label: "入力" },
    { key: "ranking", label: "ランキング" },
    { key: "history", label: "履歴" },
  ];

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-2 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm" style={{ color: "var(--primary)" }}>← トップ</Link>
          <div className="flex gap-2">
            <button
              onClick={handleCopyUrl}
              className="text-sm rounded-lg px-3 py-1 active:opacity-70"
              style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
            >
              {copied ? "コピー済み！" : "URLをコピー"}
            </button>
            <Link
              href={`/${tournamentId}/players`}
              className="text-sm rounded-lg px-3 py-1 active:opacity-70"
              style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
            >
              選手管理 ({players.length})
            </Link>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteError(""); setDeletePassword(""); }}
              className="text-sm rounded-lg px-3 py-1 active:opacity-70"
              style={{ color: "var(--error)", border: "1px solid var(--error)" }}
            >
              大会削除
            </button>
          </div>
        </div>
        <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>{tournament.name}</h1>
      </div>

      {/* 削除モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="rounded-xl p-6 w-full max-w-sm flex flex-col gap-4" style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}>
            <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>大会を削除</h2>
            <p className="text-sm" style={{ color: "var(--body)" }}>
              「{tournament.name}」を削除します。プレイヤー・対局履歴も全て消えます。
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              placeholder="管理者パスワード"
              className="rounded-lg px-4 py-3 text-lg w-full"
              style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
              autoFocus
            />
            {deleteError && <p className="text-sm" style={{ color: "var(--error)" }}>{deleteError}</p>}
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

      {/* タブ */}
      <div className="flex sticky top-0 z-10" style={{ borderBottom: "1px solid var(--hairline)", background: "var(--canvas)" }}>
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

      {/* コンテンツ */}
      <div className="px-4 py-6 flex-1">
        {tab === "ranking" && <Ranking ranking={ranking} />}

        {tab === "input" && (
          players.length >= 4 ? (
            <MatchForm
              tournamentId={tournamentId}
              players={players}
              tables={tables}
              matchCounts={Object.fromEntries(ranking.map((r) => [r.playerId, r.matchCount]))}
              maxRound={matches.reduce((max, m) => Math.max(max, m.roundNumber), 0)}
            />
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <p style={{ color: "var(--muted)" }}>
                4人以上の選手を登録すると入力できます（現在 {players.length} 人）
              </p>
              <Link
                href={`/${tournamentId}/players`}
                className="rounded-lg px-4 py-3 text-lg font-semibold text-center active:opacity-80"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                選手を登録する
              </Link>
            </div>
          )
        )}

        {tab === "history" && (
          <MatchHistory tournamentId={tournamentId} matches={matches} />
        )}
      </div>
    </div>
  );
}
