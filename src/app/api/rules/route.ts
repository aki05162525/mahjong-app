import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { route } from "@/server/http/route";
import { badRequest, internalError } from "@/server/http/errors";
import { requireUser } from "@/server/auth/requireUser";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { validateRule } from "@/lib/ruleValidation";

export async function POST(req: NextRequest) {
  return route(async () => {
    await requireUser();

    const { tournamentId, name, uma, returnPoints, isDefault } = await req.json();

    if (!tournamentId) throw badRequest("大会IDが必要です");

    await requireTournamentOwner(tournamentId);

    const validationError = validateRule({ name, uma, returnPoints });
    if (validationError) throw badRequest(validationError);

    // デフォルトは大会内で1つだけ。新たにデフォルトにする場合は既存を解除する。
    if (isDefault) {
      await getSupabaseAdmin()
        .from("rules")
        .update({ is_default: false })
        .eq("tournament_id", tournamentId)
        .eq("is_default", true);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("rules")
      .insert({
        tournament_id: tournamentId,
        name: name.trim(),
        uma,
        return_points: returnPoints,
        is_default: !!isDefault,
      })
      .select("id")
      .single();

    if (error) throw internalError("ルールの作成に失敗しました");
    return { id: data.id };
  });
}
