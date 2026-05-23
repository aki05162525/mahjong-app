import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/infra/supabase-admin";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { error } = await supabaseAdmin.from("matches").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
