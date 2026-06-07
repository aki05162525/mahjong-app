import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { route } from "@/server/http/route";
import { badRequest, conflict, notFound, internalError } from "@/server/http/errors";
import { requireUser } from "@/server/auth/requireUser";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    await requireUser();

    const { id } = await params;
    const { name } = await req.json();

    const trimmed = (name ?? "").trim();
    if (!trimmed) throw badRequest("卓名を入力してください");
    if (trimmed.length > 20) throw badRequest("卓名は20文字以内で入力してください");

    const { data: table, error: tableError } = await getSupabaseAdmin()
      .from("tables")
      .select("tournament_id")
      .eq("id", id)
      .single();

    if (tableError && tableError.code !== "PGRST116") throw internalError("内部エラー");
    if (!table) throw notFound("卓が見つかりません");

    await requireTournamentOwner(table.tournament_id);

    const { count } = await getSupabaseAdmin()
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", table.tournament_id)
      .eq("name", trimmed)
      .neq("id", id);

    if (count && count > 0) throw conflict("同じ名前の卓が既に存在します");

    const { error } = await getSupabaseAdmin()
      .from("tables")
      .update({ name: trimmed })
      .eq("id", id);

    if (error) throw internalError("変更に失敗しました");
    return { ok: true };
  });
}
