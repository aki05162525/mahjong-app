import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { getAuthUser } from "@/infra/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip).ok) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてから再試行してください" },
      { status: 429 }
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { name, customId } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "大会名を入力してください" }, { status: 400 });
  }

  if (name.trim().length > 50) {
    return NextResponse.json({ error: "大会名は50文字以内で入力してください" }, { status: 400 });
  }

  if (customId) {
    if (!/^[a-zA-Z0-9_-]+$/.test(customId)) {
      return NextResponse.json(
        { error: "IDは英数字・ハイフン・アンダースコアのみ使えます" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("tournaments")
      .insert({ id: customId, name: name.trim(), owner_id: user.id })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `「${customId}」はすでに使われています` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "大会の作成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("tournaments")
    .insert({ name: name.trim(), owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "大会の作成に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
