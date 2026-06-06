import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";
import { validateRule } from "@/lib/ruleValidation";

// ルールと所属大会のオーナーを取得し、認可する。
// 成功時は { rule } を、失敗時は { response } を返す。
async function authorize(id: string, userId: string) {
  const { data: rule, error: ruleError } = await getSupabaseAdmin()
    .from("rules")
    .select("tournament_id, is_default")
    .eq("id", id)
    .single();

  if (ruleError && ruleError.code !== "PGRST116") {
    return { response: NextResponse.json({ error: "内部エラー" }, { status: 500 }) };
  }
  if (!rule) {
    return { response: NextResponse.json({ error: "ルールが見つかりません" }, { status: 404 }) };
  }

  const { data: tournament, error: tournamentError } = await getSupabaseAdmin()
    .from("tournaments")
    .select("owner_id")
    .eq("id", rule.tournament_id)
    .single();

  if (tournamentError || !tournament) {
    return { response: NextResponse.json({ error: "内部エラー" }, { status: 500 }) };
  }
  if (tournament.owner_id !== userId) {
    return { response: NextResponse.json({ error: "権限がありません" }, { status: 403 }) };
  }

  return { rule };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;
  const auth = await authorize(id, user.id);
  if (auth.response) return auth.response;

  const { name, uma, returnPoints, isDefault } = await req.json();

  const validationError = validateRule({ name, uma, returnPoints });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // デフォルトにする場合は自分以外の既存デフォルトを解除する。
  if (isDefault) {
    await getSupabaseAdmin()
      .from("rules")
      .update({ is_default: false })
      .eq("tournament_id", auth.rule.tournament_id)
      .eq("is_default", true)
      .neq("id", id);
  }

  const { error } = await getSupabaseAdmin()
    .from("rules")
    .update({ name: name.trim(), uma, return_points: returnPoints, is_default: !!isDefault })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "変更に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await params;
  const auth = await authorize(id, user.id);
  if (auth.response) return auth.response;

  // デフォルトは大会内に必ず1つ残す。削除前に別のルールをデフォルトにすること。
  if (auth.rule.is_default) {
    return NextResponse.json(
      {
        error:
          "デフォルトのルールは削除できません。別のルールをデフォルトにしてから削除してください",
      },
      { status: 400 }
    );
  }

  const { error } = await getSupabaseAdmin().from("rules").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
