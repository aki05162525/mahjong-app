"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTournament,
  subscribePlayers,
  subscribeMatches,
  buildRanking,
  type Tournament,
  type Player,
  type Match,
  type RankingEntry,
} from "@/lib/firestore";
import MatchForm from "@/components/MatchForm";
import MatchHistory from "@/components/MatchHistory";
import Ranking from "@/components/Ranking";

type Tab = "ranking" | "input" | "history";

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
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
        <p className="text-xl text-gray-600">大会が見つかりませんでした</p>
        <Link href="/" className="text-blue-600 underline text-lg">
          トップへ戻る
        </Link>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-gray-500 text-lg">読み込み中...</p>
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
          <Link href="/" className="text-blue-600 text-sm">← トップ</Link>
          <div className="flex gap-2">
            <button
              onClick={handleCopyUrl}
              className="text-sm border rounded-lg px-3 py-1 text-blue-600 border-blue-300 active:opacity-70"
            >
              {copied ? "コピー済み！" : "URLをコピー"}
            </button>
            <Link
              href={`/${tournamentId}/players`}
              className="text-sm border rounded-lg px-3 py-1 text-gray-600 border-gray-300 active:opacity-70"
            >
              選手管理 ({players.length})
            </Link>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteError(""); setDeletePassword(""); }}
              className="text-sm border rounded-lg px-3 py-1 text-red-500 border-red-300 active:opacity-70"
            >
              大会削除
            </button>
          </div>
        </div>
        <h1 className="text-xl font-bold">{tournament.name}</h1>
      </div>

      {/* 削除モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold">大会を削除</h2>
            <p className="text-gray-600 text-sm">
              「{tournament.name}」を削除します。プレイヤー・対局履歴も全て消えます。
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              placeholder="管理者パスワード"
              className="border rounded-lg px-4 py-3 text-lg w-full"
              autoFocus
            />
            {deleteError && <p className="text-red-600 text-sm">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border rounded-lg py-3 text-base text-gray-600 active:opacity-70"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white rounded-lg py-3 text-base font-semibold active:opacity-70 disabled:opacity-50"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="flex border-b sticky top-0 bg-white z-10">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-base font-semibold border-b-2 transition-colors ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            }`}
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
          matchCounts={Object.fromEntries(ranking.map((r) => [r.playerId, r.matchCount]))}
          maxRound={matches.reduce((max, m) => Math.max(max, m.roundNumber), 0)}
        />
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-gray-500">
                4人以上の選手を登録すると入力できます（現在 {players.length} 人）
              </p>
              <Link
                href={`/${tournamentId}/players`}
                className="bg-green-600 text-white rounded-lg px-4 py-3 text-lg font-semibold text-center active:opacity-80"
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
