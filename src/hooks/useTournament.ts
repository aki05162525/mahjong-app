import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase";
import type { Tournament } from "@/lib/types";

export function useTournament(tournamentId: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("id, name, created_at")
      .eq("id", tournamentId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          return;
        }
        setTournament({ id: data.id, name: data.name, createdAt: new Date(data.created_at) });
      });
  }, [tournamentId]);

  return { tournament, notFound };
}
