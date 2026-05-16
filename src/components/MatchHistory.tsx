"use client";

import { useState } from "react";
import { deleteMatch } from "@/lib/firestore";
import type { Match } from "@/lib/firestore";
import { fmtPt } from "@/lib/utils";

type Props = { tournamentId: string; matches: Match[] };

export default function MatchHistory({ tournamentId, matches }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (matchId: string) => {
    if (!confirm("この対局結果を削除しますか？")) return;
    setDeletingId(matchId);
    try {
      await deleteMatch(tournamentId, matchId);
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>対局履歴</h2>
        <p style={{ color: "var(--muted)" }}>まだ対局結果がありません</p>
      </div>
    );
  }

  const sorted = [...matches].sort((a, b) =>
    a.roundNumber !== b.roundNumber ? a.roundNumber - b.roundNumber : a.tableName.localeCompare(b.tableName)
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>対局履歴</h2>
      <div className="flex flex-col gap-4">
        {sorted.map((match) => {
          const sortedResults = [...match.results].sort((a, b) => a.rank - b.rank);
          return (
            <div key={match.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg" style={{ color: "var(--ink)" }}>
                  第{match.roundNumber}回戦 {match.tableName}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: "var(--muted)" }}>
                    {match.createdAt.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    onClick={() => handleDelete(match.id)}
                    disabled={deletingId === match.id}
                    className="rounded-lg px-3 py-1 text-sm active:opacity-70 disabled:opacity-40"
                    style={{ color: "var(--error)", border: "1px solid var(--error)" }}
                  >
                    削除
                  </button>
                </div>
              </div>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-xs" style={{ borderBottom: "1px solid var(--hairline)", color: "var(--muted)" }}>
                    <th className="pb-1 pr-2 text-left">順位</th>
                    <th className="pb-1 pr-2 text-left">名前</th>
                    <th className="pb-1 pr-2 text-right">点数</th>
                    <th className="pb-1 pr-2 text-right">素点</th>
                    <th className="pb-1 pr-2 text-right">ウマ</th>
                    <th className="pb-1 text-right">合計pt</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((r) => (
                    <tr key={r.playerId} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <td className="py-2 pr-2" style={{ color: "var(--muted)" }}>{r.rank}位</td>
                      <td className="py-2 pr-2 font-medium" style={{ color: "var(--ink)" }}>{r.playerName}</td>
                      <td className="py-2 pr-2 text-right font-mono" style={{ color: "var(--body)" }}>{r.score.toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right font-mono" style={{ color: "var(--muted)" }}>
                        {fmtPt(r.basePoint)}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono" style={{ color: "var(--muted)" }}>
                        {fmtPt(r.umaPoint)}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold" style={{
                        color: r.totalPoint > 0 ? "var(--primary)" : r.totalPoint < 0 ? "var(--error)" : "var(--body)"
                      }}>
                        {fmtPt(r.totalPoint)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
