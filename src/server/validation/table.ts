import * as z from "zod";
import { badRequest } from "@/server/http/errors";

const nameSchema = z
  .string({ error: "卓名を入力してください" })
  .trim()
  .min(1, "卓名を入力してください")
  .max(20, "卓名は20文字以内で入力してください");

const createSchema = z.object({
  tournamentId: z.string({ error: "大会IDが必要です" }).trim().min(1, "大会IDが必要です"),
  name: nameSchema,
});

const updateSchema = z.object({ name: nameSchema });

export type CreateTableInput = z.infer<typeof createSchema>;
export type UpdateTableInput = z.infer<typeof updateSchema> & { tableId: string };
export type DeleteTableInput = { tableId: string };

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

export const parseCreateTable = (raw: unknown): CreateTableInput => parse(createSchema, raw);

export function parseUpdateTable(tableId: string, raw: unknown): UpdateTableInput {
  return { tableId, ...parse(updateSchema, raw) };
}
