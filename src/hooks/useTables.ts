import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase";
import type { Table } from "@/lib/types";

export function useTables(tournamentId: string): {
  tables: Table[];
  refetch: () => Promise<void>;
} {
  const [tables, setTables] = useState<Table[]>([]);

  const refetch = useCallback(async () => {
    try {
      await supabase
        .from("tables")
        .select("id, name, created_at")
        .eq("tournament_id", tournamentId)
        // created_at が同値のときも並び順を固定するため id をタイブレークにする。
        .order("created_at")
        .order("id")
        .then(({ data, error }) => {
          if (error) throw error;
          if (data)
            setTables(
              data.map((t) => ({ id: t.id, name: t.name, createdAt: new Date(t.created_at) }))
            );
        });
    } catch (error) {
      console.error("[useTables] Failed to fetch tables", error);
    }
  }, [tournamentId]);

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
