"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { usePlayers } from "@/hooks/usePlayers";
import { useTables } from "@/hooks/useTables";
import { useAuth } from "@/hooks/useAuth";
import { PAGE_CONTAINER } from "@/lib/layout";
import PlayerRegistration from "@/components/PlayerRegistration";
import TableRegistration from "@/components/TableRegistration";

export default function PlayersPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament } = useTournament(tournamentId);
  const { players, refetch: refetchPlayers } = usePlayers(tournamentId);
  const { tables, refetch: refetchTables } = useTables(tournamentId);
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

      <PlayerRegistration
        tournamentId={tournamentId}
        players={players}
        isOwner={isOwner}
        onChange={refetchPlayers}
      />

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "1.5rem" }}>
        <TableRegistration
          tournamentId={tournamentId}
          tables={tables}
          isOwner={isOwner}
          onChange={refetchTables}
        />
      </div>
    </main>
  );
}
