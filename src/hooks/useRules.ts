import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase";
import type { Rule } from "@/lib/types";

export function useRules(tournamentId: string): {
  rules: Rule[];
  refetch: () => PromiseLike<void>;
} {
  const [rules, setRules] = useState<Rule[]>([]);

  const refetch = useCallback(
    () =>
      supabase
        .from("rules")
        .select("id, name, uma, return_points, is_default, created_at")
        .eq("tournament_id", tournamentId)
        .order("created_at")
        .then(({ data }) => {
          if (data)
            setRules(
              data.map((r) => ({
                id: r.id,
                name: r.name,
                uma: r.uma,
                returnPoints: r.return_points,
                isDefault: r.is_default,
                createdAt: new Date(r.created_at),
              }))
            );
        }),
    [tournamentId]
  );

  useEffect(() => {
    refetch();

    const channel = supabase
      .channel("rules:" + tournamentId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rules",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, refetch]);

  return { rules, refetch };
}
