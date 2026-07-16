import * as z from "zod";
import { badRequest } from "@/server/http/errors";

const ruleFields = {
  name: z
    .string({ error: "ルール名（名前）を入力してください" })
    .trim()
    .min(1, "ルール名（名前）を入力してください")
    .max(30, "ルール名は30文字以内で入力してください"),
  uma: z
    .array(z.int(), { error: "ウマは整数4つで指定してください" })
    .length(4, "ウマは整数4つで指定してください")
    .refine(
      (uma) => uma.reduce((sum, value) => sum + value, 0) === 0,
      "ウマの合計は0にしてください"
    ),
  returnPoints: z
    .int({ error: "返し点は25000以上の整数で指定してください" })
    .min(25000, "返し点は25000以上の整数で指定してください"),
  isDefault: z.boolean().default(false),
};

const createSchema = z.object({
  tournamentId: z.string({ error: "大会IDが必要です" }).trim().min(1, "大会IDが必要です"),
  ...ruleFields,
});

const updateSchema = z.object(ruleFields);

export type CreateRuleInput = z.infer<typeof createSchema>;
export type UpdateRuleInput = z.infer<typeof updateSchema> & { ruleId: string };
export type DeleteRuleInput = { ruleId: string };

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

export const parseCreateRule = (raw: unknown): CreateRuleInput => parse(createSchema, raw);

export function parseUpdateRule(ruleId: string, raw: unknown): UpdateRuleInput {
  return { ruleId, ...parse(updateSchema, raw) };
}
