import * as z from "zod";
import { badRequest } from "@/server/http/errors";

const schema = z.object({
  tournamentId: z.string().trim().min(1),
  tableId: z.uuid().nullable().optional(),
  roundNumber: z.int().min(1),
  ruleId: z.uuid(),
  inputs: z
    .array(
      z.object({
        playerId: z.uuid(),
        score: z.int(),
      })
    )
    .length(4),
});

const deleteSchema = z.object({ matchId: z.uuid() });

export type CreateMatchInput = z.infer<typeof schema>;
export type DeleteMatchInput = z.infer<typeof deleteSchema>;

export function parseCreateMatch(raw: unknown): CreateMatchInput {
  const result = schema.safeParse(raw);
  if (!result.success) throw badRequest("入力が正しくありません", z.flattenError(result.error));
  return result.data;
}

export function parseDeleteMatch(raw: unknown): DeleteMatchInput {
  const result = deleteSchema.safeParse(raw);
  if (!result.success) throw badRequest("対局IDが正しくありません", z.flattenError(result.error));
  return result.data;
}
