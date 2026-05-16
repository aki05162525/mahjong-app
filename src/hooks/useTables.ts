import { useEffect, useState } from "react";
import { subscribeTables, type Table } from "@/lib/firestore";

export function useTables(tournamentId: string): Table[] {
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    return subscribeTables(tournamentId, setTables);
  }, [tournamentId]);

  return tables;
}
