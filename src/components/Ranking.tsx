"use client";

import type { RankingEntry } from "@/lib/firestore";
import { fmtPt } from "@/lib/utils";

type Props = { ranking: RankingEntry[] };

export default function Ranking({ ranking }: Props) {
  if (ranking.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>総合ランキング</h2>
        <p style={{ color: "var(--muted)" }}>まだ対局結果がありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>総合ランキング</h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm border-collapse whitespace-nowrap">
          <thead>
            <tr className="text-xs" style={{ borderBottom: "2px solid var(--hairline)", color: "var(--muted)" }}>
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
              <tr key={entry.playerId} style={{ borderBottom: "1px solid var(--hairline)" }}>
                <td className="py-3 pr-2 text-center text-base" style={{ color: "var(--muted)" }}>
                  {entry.rank}
                </td>
                <td className="py-3 pr-3 font-semibold text-base" style={{ color: "var(--ink)" }}>{entry.playerName}</td>
                <td className="py-3 pr-3 text-right font-mono font-bold text-base" style={{
                  color: entry.totalPoint > 0 ? "var(--primary)" : entry.totalPoint < 0 ? "var(--error)" : "var(--body)"
                }}>
                  {fmtPt(entry.totalPoint)}
                </td>
                <td className="py-3 pr-3 text-right font-mono" style={{ color: "var(--body)" }}>
                  {entry.avgScore.toLocaleString()}
                </td>
                <td className="py-3 pr-3 text-right font-mono" style={{ color: "var(--body)" }}>{entry.avgRank}</td>
                <td className="py-3 pr-3 text-right font-mono" style={{ color: "var(--body)" }}>{(entry.topRate / 100).toFixed(2)}</td>
                <td className="py-3 pr-3 text-right font-mono" style={{ color: "var(--body)" }}>{(entry.inTheMoneyRate / 100).toFixed(2)}</td>
                <td className="py-3 pr-3 text-right font-mono" style={{ color: "var(--body)" }}>{(entry.lastAvoidRate / 100).toFixed(2)}</td>
                <td className="py-3 text-right" style={{ color: "var(--muted)" }}>{entry.matchCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
