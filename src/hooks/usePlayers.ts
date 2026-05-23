import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase";
import type { Player } from "@/lib/types";

export function usePlayers(tournamentId: string): Player[] {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const fetch = () =>
      supabase
        .from("players")
        .select("id, name, created_at")
        .eq("tournament_id", tournamentId)
        .order("created_at")
        .then(({ data }) => {
          if (data)
            setPlayers(
              data.map((p) => ({ id: p.id, name: p.name, createdAt: new Date(p.created_at) }))
            );
        });

    fetch();

    const channel = supabase
      .channel("players:" + tournamentId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        fetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return players;
}
