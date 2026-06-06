import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase";
import type { Player } from "@/lib/types";

export function usePlayers(tournamentId: string): {
  players: Player[];
  refetch: () => PromiseLike<void>;
} {
  const [players, setPlayers] = useState<Player[]>([]);

  const refetch = useCallback(
    () =>
      supabase
        .from("players")
        .select("id, name, created_at")
        .eq("tournament_id", tournamentId)
        // created_at が同値のときも並び順を固定するため id をタイブレークにする。
        .order("created_at")
        .order("id")
        .then(({ data }) => {
          if (data)
            setPlayers(
              data.map((p) => ({ id: p.id, name: p.name, createdAt: new Date(p.created_at) }))
            );
        }),
    [tournamentId]
  );

  useEffect(() => {
    refetch();

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
        refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refetch]);

  return { players, refetch };
}
