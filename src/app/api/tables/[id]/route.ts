import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await req.json();

  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "卓名を入力してください" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("tables")
    .update({ name: trimmed })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "変更に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
