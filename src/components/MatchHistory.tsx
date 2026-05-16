"use client";

import { useState } from "react";
import { deleteMatch } from "@/lib/firestore";
import type { Match } from "@/lib/firestore";

type Props = {
  tournamentId: string;
  matches: Match[];
};

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
        <h2 className="text-xl font-semibold">対局履歴</h2>
        <p className="text-gray-500">まだ対局結果がありません</p>
      </div>
    );
  }

  const sorted = [...matches].sort((a, b) => {
    if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
    return a.tableName.localeCompare(b.tableName);
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">対局履歴</h2>
      <div className="flex flex-col gap-4">
        {sorted.map((match) => {
          const sortedResults = [...match.results].sort((a, b) => a.rank - b.rank);
          return (
            <div key={match.id} className="border rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">
                  第{match.roundNumber}回戦 {match.tableName}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {match.createdAt.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    onClick={() => handleDelete(match.id)}
                    disabled={deletingId === match.id}
                    className="text-red-500 border border-red-300 rounded-lg px-3 py-1 text-sm active:opacity-70 disabled:opacity-40"
                  >
                    削除
                  </button>
                </div>
              </div>
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="pb-1 pr-2">順位</th>
                    <th className="pb-1 pr-2">名前</th>
                    <th className="pb-1 pr-2 text-right">点数</th>
                    <th className="pb-1 pr-2 text-right">素点</th>
                    <th className="pb-1 pr-2 text-right">ウマ</th>
                    <th className="pb-1 text-right">合計pt</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((r) => (
                    <tr key={r.playerId} className="border-b border-gray-100">
                      <td className="py-2 pr-2">{r.rank}位</td>
                      <td className="py-2 pr-2 font-medium">{r.playerName}</td>
                      <td className="py-2 pr-2 text-right font-mono">{r.score.toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right font-mono text-gray-600">
                        {r.basePoint > 0 ? `+${r.basePoint}` : r.basePoint}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono text-gray-600">
                        {r.umaPoint > 0 ? `+${r.umaPoint}` : r.umaPoint}
                      </td>
                      <td
                        className={`py-2 text-right font-mono font-semibold ${
                          r.totalPoint > 0 ? "text-blue-700" : r.totalPoint < 0 ? "text-red-600" : ""
                        }`}
                      >
                        {r.totalPoint > 0 ? `+${r.totalPoint}` : r.totalPoint}
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
