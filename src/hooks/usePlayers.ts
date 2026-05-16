import { useEffect, useState } from "react";
import { subscribePlayers, type Player } from "@/lib/firestore";

export function usePlayers(tournamentId: string): Player[] {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    return subscribePlayers(tournamentId, setPlayers);
  }, [tournamentId]);

  return players;
}
