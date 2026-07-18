import * as z from "zod";
import { badRequest } from "@/server/http/errors";

export const playerNameSchema = z
  .string({ error: "名前を入力してください" })
  .trim()
  .min(1, "名前を入力してください")
  .max(20, "名前は20文字以内で入力してください");

const createSchema = z.object({
  tournamentId: z.string({ error: "大会IDが必要です" }).trim().min(1, "大会IDが必要です"),
  name: playerNameSchema,
});

const updateSchema = z.object({ name: playerNameSchema });

export type CreatePlayerInput = z.infer<typeof createSchema>;
export type UpdatePlayerInput = z.infer<typeof updateSchema> & { playerId: string };

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw badRequest(
      result.error.issues[0]?.message ?? "入力が正しくありません",
      z.flattenError(result.error)
    );
  }
  return result.data;
}

export const parseCreatePlayer = (raw: unknown): CreatePlayerInput => parse(createSchema, raw);

export function parseUpdatePlayer(playerId: string, raw: unknown): UpdatePlayerInput {
  return { playerId, ...parse(updateSchema, raw) };
}
