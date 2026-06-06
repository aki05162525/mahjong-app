import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";
import { validateRule } from "@/lib/ruleValidation";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { tournamentId, name, uma, returnPoints, isDefault } = await req.json();

  if (!tournamentId) {
    return NextResponse.json({ error: "大会IDが必要です" }, { status: 400 });
  }

  const { data: tournament, error: tournamentError } = await getSupabaseAdmin()
    .from("tournaments")
    .select("owner_id")
    .eq("id", tournamentId)
    .single();

  if (tournamentError && tournamentError.code !== "PGRST116") {
    return NextResponse.json({ error: "内部エラー" }, { status: 500 });
  }
  if (!tournament) {
    return NextResponse.json({ error: "大会が見つかりません" }, { status: 404 });
  }
  if (tournament.owner_id !== user.id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const validationError = validateRule({ name, uma, returnPoints });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

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

  if (error) {
    return NextResponse.json({ error: "ルールの作成に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
