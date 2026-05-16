"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { usePlayers } from "@/hooks/usePlayers";
import { useTables } from "@/hooks/useTables";
import PlayerRegistration from "@/components/PlayerRegistration";
import TableRegistration from "@/components/TableRegistration";

export default function PlayersPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament } = useTournament(tournamentId);
  const players = usePlayers(tournamentId);
  const tables = useTables(tournamentId);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/${tournamentId}`} className="text-sm" style={{ color: "var(--primary)" }}>
          ← 大会ページへ戻る
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{tournament?.name ?? ""}</h1>
      </div>

      <PlayerRegistration tournamentId={tournamentId} players={players} />

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "1.5rem" }}>
        <TableRegistration tournamentId={tournamentId} tables={tables} />
      </div>
    </main>
  );
}
