"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { usePlayers } from "@/hooks/usePlayers";
import { useTables } from "@/hooks/useTables";
import { useRules } from "@/hooks/useRules";
import { useMatches } from "@/hooks/useMatches";
import { useAuth } from "@/hooks/useAuth";
import { parseTokenFromHash, saveWriteToken, loadWriteToken } from "@/lib/recordToken";
import TournamentTabs from "@/components/TournamentTabs";

/**
 * 記録ページ。主催者から配られた記録リンク（/record/[id]#k=<token>）で開く。
 * 記録リンク＝閲覧の上位互換（読み取り + 書き込み）なので、入力に加えて
 * ランキング・履歴タブも持つ。トークンは fragment で受け取り、localStorage に
 * 退避してから URL から消す（fragment はサーバーに送信されずログに残らない）。
 */
export default function RecordPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament, notFound } = useTournament(tournamentId);
  const { players } = usePlayers(tournamentId);
  const { tables } = useTables(tournamentId);
  const { rules } = useRules(tournamentId);
  const { matches, ranking } = useMatches(tournamentId);
  const { user, loading: authLoading } = useAuth();

  const isOwner = !!user && !!tournament && user.id === tournament.ownerId;

  // undefined = fragment 未処理（1回目のレンダー）。null = トークン無し。
  const [writeToken, setWriteToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const fromHash = parseTokenFromHash(window.location.hash);
    if (fromHash) {
      saveWriteToken(tournamentId, fromHash);
      // トークンを履歴・アドレスバーに残さない
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    // fragment / localStorage は SSR では読めないため、hydration 後に一度だけ読んで確定させる
    // （リンクを一度開いた後のリロードや再訪問は退避済みトークンで記録する）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWriteToken(fromHash ?? loadWriteToken(tournamentId));
  }, [tournamentId]);

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

  // トークンが無い場合はオーナーかどうかで表示が変わるため、認証の確定も待つ
  if (!tournament || writeToken === undefined || (writeToken === null && authLoading)) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-lg" style={{ color: "var(--muted)" }}>
          読み込み中...
        </p>
      </main>
    );
  }

  // トークンが無くてもオーナーは記録できる（サーバー側の owner バイパス）
  const canRecord = writeToken !== null || isOwner;

  return (
    // 閲覧ページとタブ幅・表の見え方を揃えるため、PC ではコンテナを広げる
    <div className="w-full max-w-2xl lg:max-w-4xl mx-auto flex flex-col min-h-screen overflow-x-hidden">
      <div className="px-4 pt-4 pb-2 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-xs font-semibold rounded-full px-2 py-1"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            記録用ページ
          </span>
          <Link
            href={`/${tournamentId}`}
            className="text-sm rounded-lg px-3 py-1 active:opacity-70"
            style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
          >
            閲覧ページを開く
          </Link>
        </div>
        <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
          {tournament.name}
        </h1>
      </div>

      <TournamentTabs
        tournamentId={tournamentId}
        players={players}
        tables={tables}
        rules={rules}
        matches={matches}
        ranking={ranking}
        isOwner={isOwner}
        input={{ writeToken, canRecord }}
      />
    </div>
  );
}
