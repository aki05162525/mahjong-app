"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { useRules } from "@/hooks/useRules";
import { useAuth } from "@/hooks/useAuth";
import { PAGE_CONTAINER } from "@/lib/layout";
import RuleManagement from "@/components/RuleManagement";

export default function RulesPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament } = useTournament(tournamentId);
  const { rules, refetch } = useRules(tournamentId);
  const { user } = useAuth();

  const isOwner = !!user && !!tournament && user.id === tournament.ownerId;

  return (
    <main className={`${PAGE_CONTAINER} px-4 py-6 flex flex-col gap-6`}>
      <div className="flex flex-col gap-1">
        <Link href={`/${tournamentId}`} className="text-sm" style={{ color: "var(--primary)" }}>
          ← 大会ページへ戻る
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
          {tournament?.name ?? ""}
        </h1>
      </div>

      <RuleManagement
        tournamentId={tournamentId}
        rules={rules}
        isOwner={isOwner}
        onChange={refetch}
      />
    </main>
  );
}
