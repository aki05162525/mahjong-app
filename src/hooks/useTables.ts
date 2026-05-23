import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase";
import type { Table } from "@/lib/types";

export function useTables(tournamentId: string): Table[] {
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    const fetch = () =>
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
        });

    fetch();

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
        fetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return tables;
}
