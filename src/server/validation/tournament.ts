import * as z from "zod";
import { badRequest } from "@/server/http/errors";
import { SEED_RULES } from "@/lib/seedRules";
import { playerNameSchema } from "./player";
import { ruleFields } from "./rule";

// セットアップウィザードのルール選択。プリセットは大会作成時に seed される
// SEED_RULES から選ぶ（行を増やさずデフォルトフラグだけ切り替える）
const ruleChoiceSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("preset"),
      name: z
        .string({ error: "プリセット名が必要です" })
        .trim()
        .refine(
          (name) => SEED_RULES.some((seed) => seed.name === name),
          "存在しないプリセットです"
        ),
    }),
    z.object({ type: z.literal("custom"), ...ruleFields }),
  ],
  { error: "ルールの指定が正しくありません" }
);

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
    .refine(
      // アプリの静的ルートと衝突する ID は大会ページに到達できなくなるため拒否する
      (value) => !["new", "record", "auth", "api"].includes(value.toLowerCase()),
      "このIDは使えません"
    )
    .optional()
    .transform((value) => value || undefined),
  players: z
    .array(playerNameSchema, { error: "プレイヤーは名前の配列で指定してください" })
    .max(100, "プレイヤーは100人までです")
    .refine((names) => new Set(names).size === names.length, "プレイヤー名が重複しています")
    .optional(),
  rule: ruleChoiceSchema.optional(),
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
