import { useEffect, useState } from "react";
import { getTournament, type Tournament } from "@/lib/firestore";

export function useTournament(tournamentId: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getTournament(tournamentId).then((t) => {
      if (!t) setNotFound(true);
      else setTournament(t);
    });
  }, [tournamentId]);

  return { tournament, notFound };
}
