"use client";

import type { RankingEntry } from "@/lib/firestore";

type Props = {
  ranking: RankingEntry[];
};

const pt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export default function Ranking({ ranking }: Props) {
  if (ranking.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">総合ランキング</h2>
        <p className="text-gray-500">まだ対局結果がありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">総合ランキング</h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b-2 border-gray-300 text-gray-500 text-xs">
              <th className="py-2 pr-2 text-left w-6">順</th>
              <th className="py-2 pr-3 text-left">名前</th>
              <th className="py-2 pr-3 text-right">合計</th>
              <th className="py-2 pr-3 text-right">平均打点</th>
              <th className="py-2 pr-3 text-right">平均着順</th>
              <th className="py-2 pr-3 text-right">トップ率</th>
              <th className="py-2 pr-3 text-right">連対率</th>
              <th className="py-2 pr-3 text-right">ラス回避</th>
              <th className="py-2 text-right">対局</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry) => (
              <tr key={entry.playerId} className="border-b border-gray-100">
                <td className="py-3 pr-2 text-center text-base">
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                </td>
                <td className="py-3 pr-3 font-semibold text-base">{entry.playerName}</td>
                <td className={`py-3 pr-3 text-right font-mono font-bold text-base ${
                  entry.totalPoint > 0 ? "text-blue-700" : entry.totalPoint < 0 ? "text-red-600" : ""
                }`}>
                  {pt(entry.totalPoint)}
                </td>
                <td className="py-3 pr-3 text-right font-mono">{entry.avgScore.toLocaleString()}</td>
                <td className="py-3 pr-3 text-right font-mono">{entry.avgRank}</td>
                <td className="py-3 pr-3 text-right font-mono">{(entry.topRate / 100).toFixed(2)}</td>
                <td className="py-3 pr-3 text-right font-mono">{(entry.inTheMoneyRate / 100).toFixed(2)}</td>
                <td className="py-3 pr-3 text-right font-mono">{(entry.lastAvoidRate / 100).toFixed(2)}</td>
                <td className="py-3 text-right text-gray-500">{entry.matchCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
