"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/infra/supabase";
import type { Tournament } from "@/lib/types";

export default function TopPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const [tournamentCache, setTournamentCache] = useState<{
    userId: string;
    list: Tournament[];
  } | null>(null);
  const listLoaded = tournamentCache !== null && tournamentCache.userId === user?.id;
  const myTournaments = listLoaded ? tournamentCache.list : [];

  useEffect(() => {
    if (!user) return;
    let aborted = false;
    supabase
      .from("tournaments")
      .select("id, name, created_at, owner_id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (aborted || !data) return;
        setTournamentCache({
          userId: user.id,
          list: data.map((t) => ({
            id: t.id,
            name: t.name,
            createdAt: new Date(t.created_at),
            ownerId: t.owner_id,
          })),
        });
      });
    return () => {
      aborted = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-hairline bg-surface-card">
        <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
          <h1 className="font-bold text-ink">ウマオカ</h1>
          {!loading && user && (
            <button
              onClick={() => signOut()}
              className="text-sm text-muted transition-colors hover:text-ink active:opacity-70"
            >
              ログアウト
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-8">
        {loading ? (
          /* 認証確認中: 作成カードと同じ形のスケルトンで白画面のチラつきを防ぐ */
          <section
            aria-hidden
            className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-6 shadow-sm"
          >
            <div className="h-6 w-40 animate-pulse rounded bg-surface-strong" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-strong" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-surface-strong" />
          </section>
        ) : user ? (
          /* ログイン済み: 大会作成 + マイ大会 */
          <>
            <section className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">新しい大会を作成</h2>
              <p className="text-sm text-muted">
                大会名・選手・ルールを順番に登録して、記録を始める準備をします
              </p>
              <Link
                href="/new"
                className="mt-1 w-full rounded-lg bg-primary px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-primary-active active:bg-primary-active"
              >
                大会を作成
              </Link>
            </section>

            {listLoaded && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-muted">自分の大会</h2>
                {myTournaments.length === 0 ? (
                  <p className="text-sm text-muted">まだ大会がありません。</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {myTournaments.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/${t.id}`}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface-card px-4 py-3 transition-colors hover:border-primary"
                        >
                          <span className="flex flex-col">
                            <span className="font-semibold text-ink">{t.name}</span>
                            <span className="mt-0.5 text-xs text-muted">
                              作成日: {t.createdAt.toLocaleDateString("ja-JP")}
                            </span>
                          </span>
                          <span
                            aria-hidden
                            className="text-lg text-muted transition-colors group-hover:text-primary"
                          >
                            ›
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        ) : (
          /* 未ログイン: Googleログインボタン */
          <section className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">大会を作成・管理する</h2>
            <p className="text-sm text-muted">
              Googleアカウントでログインすると、大会の作成と管理ができます
            </p>
            <button
              onClick={() => signInWithGoogle()}
              className="mt-1 w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-active active:bg-primary-active"
            >
              Googleでログイン
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
