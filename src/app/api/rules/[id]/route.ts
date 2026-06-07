import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { route } from "@/server/http/route";
import { badRequest, notFound, internalError } from "@/server/http/errors";
import { requireUser } from "@/server/auth/requireUser";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";
import { validateRule } from "@/lib/ruleValidation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    await requireUser();

    const { id } = await params;

    const { data: rule, error: ruleError } = await getSupabaseAdmin()
      .from("rules")
      .select("tournament_id, is_default")
      .eq("id", id)
      .single();

    if (ruleError && ruleError.code !== "PGRST116") throw internalError("内部エラー");
    if (!rule) throw notFound("ルールが見つかりません");

    await requireTournamentOwner(rule.tournament_id);

    const { name, uma, returnPoints, isDefault } = await req.json();

    const validationError = validateRule({ name, uma, returnPoints });
    if (validationError) throw badRequest(validationError);

    // デフォルトにする場合は自分以外の既存デフォルトを解除する。
    if (isDefault) {
      await getSupabaseAdmin()
        .from("rules")
        .update({ is_default: false })
        .eq("tournament_id", rule.tournament_id)
        .eq("is_default", true)
        .neq("id", id);
    }

    const { error } = await getSupabaseAdmin()
      .from("rules")
      .update({ name: name.trim(), uma, return_points: returnPoints, is_default: !!isDefault })
      .eq("id", id);

    if (error) throw internalError("変更に失敗しました");
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    await requireUser();

    const { id } = await params;

    const { data: rule, error: ruleError } = await getSupabaseAdmin()
      .from("rules")
      .select("tournament_id, is_default")
      .eq("id", id)
      .single();

    if (ruleError && ruleError.code !== "PGRST116") throw internalError("内部エラー");
    if (!rule) throw notFound("ルールが見つかりません");

    await requireTournamentOwner(rule.tournament_id);

    // デフォルトは大会内に必ず1つ残す。削除前に別のルールをデフォルトにすること。
    if (rule.is_default) {
      throw badRequest(
        "デフォルトのルールは削除できません。別のルールをデフォルトにしてから削除してください"
      );
    }

    const { error } = await getSupabaseAdmin().from("rules").delete().eq("id", id);

    if (error) throw internalError("削除に失敗しました");
    return { ok: true };
  });
}
