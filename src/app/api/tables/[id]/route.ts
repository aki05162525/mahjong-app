import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();

  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "卓名を入力してください" }, { status: 400 });
  }
  if (trimmed.length > 20) {
    return NextResponse.json({ error: "卓名は20文字以内で入力してください" }, { status: 400 });
  }

  const { data: table } = await supabaseAdmin
    .from("tables")
    .select("tournament_id")
    .eq("id", id)
    .single();

  if (!table) {
    return NextResponse.json({ error: "卓が見つかりません" }, { status: 404 });
  }

  const { count } = await supabaseAdmin
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", table.tournament_id)
    .eq("name", trimmed)
    .neq("id", id);

  if (count && count > 0) {
    return NextResponse.json({ error: "同じ名前の卓が既に存在します" }, { status: 409 });
  }

  const { error } = await supabaseAdmin.from("tables").update({ name: trimmed }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "変更に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
