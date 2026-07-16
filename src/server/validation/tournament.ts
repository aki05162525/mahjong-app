import * as z from "zod";
import { badRequest } from "@/server/http/errors";

const createSchema = z.object({
  name: z
    .string({ error: "大会名を入力してください" })
    .trim()
    .min(1, "大会名を入力してください")
    .max(50, "大会名は50文字以内で入力してください"),
  customId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[a-zA-Z0-9_-]+$/.test(value),
      "IDは英数字・ハイフン・アンダースコアのみ使えます"
    )
    .optional()
    .transform((value) => value || undefined),
});

const deleteSchema = z.object({
  tournamentId: z.string({ error: "大会IDが必要です" }).trim().min(1, "大会IDが必要です"),
});

export type CreateTournamentInput = z.infer<typeof createSchema>;
export type DeleteTournamentInput = z.infer<typeof deleteSchema>;

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

export const parseCreateTournament = (raw: unknown): CreateTournamentInput =>
  parse(createSchema, raw);
export const parseDeleteTournament = (raw: unknown): DeleteTournamentInput =>
  parse(deleteSchema, raw);
