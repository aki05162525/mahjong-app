"use client";

import { useState } from "react";
import type { Match } from "@/lib/types";
import { fmtPt } from "@/lib/utils";

type Props = { matches: Match[]; isOwner?: boolean };

export default function MatchHistory({ matches, isOwner = false }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  // 履歴に登場する重複なしのプレイヤー一覧（名前順）
  const players = (() => {
    const map = new Map<string, string>();
    for (const match of matches) {
      for (const r of match.results) map.set(r.playerId, r.playerName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  })();

  // 4人以下は全員が毎回同卓するため絞り込みの意味がない
  const showFilter = players.length >= 5;

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("この対局結果を削除しますか？")) return;
    setDeletingId(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      if (!res.ok) alert("削除に失敗しました");
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
          対局履歴
        </h2>
        <p style={{ color: "var(--muted)" }}>まだ対局結果がありません</p>
      </div>
    );
  }

  const sorted = [...matches].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // AND 絞り込み: 選んだ全員が同卓した対局のみ残す
  const filtered =
    selectedPlayerIds.size === 0
      ? sorted
      : sorted.filter((match) => {
          const ids = new Set(match.results.map((r) => r.playerId));
          return [...selectedPlayerIds].every((id) => ids.has(id));
        });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
        対局履歴
      </h2>
      {showFilter && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              選んだ全員が同卓した対局を表示
            </span>
            {selectedPlayerIds.size > 0 && (
              <button
                onClick={() => setSelectedPlayerIds(new Set())}
                className="text-xs active:opacity-70"
                style={{ color: "var(--primary)" }}
              >
                クリア
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const selected = selectedPlayerIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className="rounded-full px-3 py-1 text-sm active:opacity-70"
                  style={
                    selected
                      ? { background: "var(--primary)", color: "#fff" }
                      : {
                          color: "var(--body)",
                          border: "1px solid var(--hairline)",
                        }
                  }
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>該当する対局がありません</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((match) => {
            const sortedResults = [...match.results].sort((a, b) => a.rank - b.rank);
            return (
              <div
                key={match.id}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg" style={{ color: "var(--ink)" }}>
                    第{match.roundNumber}回戦 {match.tableName}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: "var(--muted)" }}>
                      {match.createdAt.toLocaleString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(match.id)}
                        disabled={deletingId === match.id}
                        className="rounded-lg px-3 py-1 text-sm active:opacity-70 disabled:opacity-40"
                        style={{ color: "var(--error)", border: "1px solid var(--error)" }}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
                <table className="w-full text-base">
                  <thead>
                    <tr
                      className="text-xs"
                      style={{ borderBottom: "1px solid var(--hairline)", color: "var(--muted)" }}
                    >
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
                        <td className="py-2 pr-2" style={{ color: "var(--muted)" }}>
                          {r.rank}位
                        </td>
                        <td className="py-2 pr-2 font-medium" style={{ color: "var(--ink)" }}>
                          {r.playerName}
                        </td>
                        <td
                          className="py-2 pr-2 text-right font-mono"
                          style={{ color: "var(--body)" }}
                        >
                          {r.score.toLocaleString()}
                        </td>
                        <td
                          className="py-2 pr-2 text-right font-mono"
                          style={{ color: "var(--muted)" }}
                        >
                          {fmtPt(r.basePoint)}
                        </td>
                        <td
                          className="py-2 pr-2 text-right font-mono"
                          style={{ color: "var(--muted)" }}
                        >
                          {fmtPt(r.umaPoint)}
                        </td>
                        <td
                          className="py-2 text-right font-mono font-semibold"
                          style={{ color: "var(--primary)" }}
                        >
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
      )}
    </div>
  );
}
