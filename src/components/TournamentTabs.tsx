"use client";

import { useState } from "react";
import Link from "next/link";
import MatchForm from "@/components/MatchForm";
import MatchFormFour from "@/components/MatchFormFour";
import MatchHistory from "@/components/MatchHistory";
import Ranking from "@/components/Ranking";
import type { Player, Table, Match, Rule, RankingEntry } from "@/lib/types";

type InputTab = {
  /** 記録トークン。null ならログイン済みオーナーとしての記録を試みる */
  writeToken: string | null;
  /** false なら入力タブにフォームではなく記録用リンクの案内を出す */
  canRecord: boolean;
};

type Props = {
  tournamentId: string;
  players: Player[];
  tables: Table[];
  rules: Rule[];
  matches: Match[];
  ranking: RankingEntry[];
  isOwner: boolean;
  /** 指定すると「入力」タブが先頭に付く（記録ページ用）。省略すると閲覧専用 */
  input?: InputTab;
};

type Tab = "input" | "ranking" | "history";

/**
 * 大会ページのタブ + コンテンツ。閲覧ページと記録ページで共有し、
 * 「入力」タブの有無（= 書き込み capability）だけを props で切り替える。
 * 読み取りは誰でもできる設計のため、記録ページ＝閲覧の上位互換になる。
 */
export default function TournamentTabs({
  tournamentId,
  players,
  tables,
  rules,
  matches,
  ranking,
  isOwner,
  input,
}: Props) {
  const [tab, setTab] = useState<Tab>(input ? "input" : "ranking");

  const tabs: { key: Tab; label: string }[] = [
    ...(input ? [{ key: "input" as const, label: "入力" }] : []),
    { key: "ranking", label: "ランキング" },
    { key: "history", label: "履歴" },
  ];

  const matchCounts = Object.fromEntries(ranking.map((r) => [r.playerId, r.matchCount]));
  const maxRound = matches.reduce((max, m) => Math.max(max, m.roundNumber), 0);

  return (
    <>
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

      {/* コンテンツ */}
      <div className="px-4 py-6 flex-1">
        {/* 入力フォームは広い画面では間延びするため、閲覧系タブと違い幅を抑えて中央寄せする */}
        {tab === "input" && input && (
          <div className="w-full max-w-xl mx-auto">
            {!input.canRecord ? (
              <div className="flex flex-col gap-3 mt-4">
                <p style={{ color: "var(--body)" }}>
                  このページで記録するには、主催者から配られた記録用URLで開いてください。
                </p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  URLが無効と言われた場合は、主催者に新しい記録用URLをもらってください。
                </p>
              </div>
            ) : players.length === 4 && tables.length < 2 ? (
              // ちょうど4人・単一卓は組み合わせが1通り。選択を省きドラッグ＋点数入力に特化する。
              <MatchFormFour
                tournamentId={tournamentId}
                players={players}
                rules={rules}
                maxRound={maxRound}
                writeToken={input.writeToken}
              />
            ) : players.length >= 4 ? (
              <MatchForm
                tournamentId={tournamentId}
                players={players}
                tables={tables}
                rules={rules}
                matches={matches}
                matchCounts={matchCounts}
                maxRound={maxRound}
                writeToken={input.writeToken}
              />
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                <p style={{ color: "var(--muted)" }}>
                  4人以上の選手を登録すると入力できます（現在 {players.length} 人）
                </p>
                {isOwner && (
                  <Link
                    href={`/${tournamentId}/players`}
                    className="rounded-lg px-4 py-3 text-lg font-semibold text-center active:opacity-80"
                    style={{ background: "var(--primary)", color: "#fff" }}
                  >
                    選手を登録する
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "ranking" && <Ranking ranking={ranking} />}

        {tab === "history" && (
          <MatchHistory matches={matches} isOwner={isOwner} showTable={tables.length >= 2} />
        )}
      </div>
    </>
  );
}
