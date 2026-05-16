"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTournament, subscribePlayers, subscribeTables, type Player, type Table } from "@/lib/firestore";
import PlayerRegistration from "@/components/PlayerRegistration";
import TableRegistration from "@/components/TableRegistration";

export default function PlayersPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournamentName, setTournamentName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    getTournament(tournamentId).then((t) => {
      if (t) setTournamentName(t.name);
    });
  }, [tournamentId]);

  useEffect(() => {
    const unsub = subscribePlayers(tournamentId, setPlayers);
    return unsub;
  }, [tournamentId]);

  useEffect(() => {
    const unsub = subscribeTables(tournamentId, setTables);
    return unsub;
  }, [tournamentId]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/${tournamentId}`} className="text-sm" style={{ color: "var(--primary)" }}>
          ← 大会ページへ戻る
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{tournamentName}</h1>
      </div>

      <PlayerRegistration tournamentId={tournamentId} players={players} />

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "1.5rem" }}>
        <TableRegistration tournamentId={tournamentId} tables={tables} />
      </div>
    </main>
  );
}
