import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase";
import type { Table } from "@/lib/types";

export function useTables(tournamentId: string): {
  tables: Table[];
  refetch: () => PromiseLike<void>;
} {
  const [tables, setTables] = useState<Table[]>([]);

  const refetch = useCallback(
    () =>
      supabase
        .from("tables")
        .select("id, name, created_at")
        .eq("tournament_id", tournamentId)
        .order("created_at")
        .then(({ data }) => {
          if (data)
            setTables(
              data.map((t) => ({ id: t.id, name: t.name, createdAt: new Date(t.created_at) }))
            );
        }),
    [tournamentId]
  );

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel("tables:" + tournamentId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refetch]);

  return { tables, refetch };
}
