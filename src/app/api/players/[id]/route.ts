import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { route } from "@/server/http/route";
import { badRequest, conflict, notFound, internalError } from "@/server/http/errors";
import { requireUser } from "@/server/auth/requireUser";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const user = await requireUser();

    const { id } = await params;
    const { name } = await req.json();

    const trimmed = (name ?? "").trim();
    if (!trimmed) throw badRequest("名前を入力してください");
    if (trimmed.length > 20) throw badRequest("名前は20文字以内で入力してください");

    const { data: player, error: playerError } = await getSupabaseAdmin()
      .from("players")
      .select("tournament_id")
      .eq("id", id)
      .single();

    if (playerError && playerError.code !== "PGRST116") throw internalError("内部エラー");
    if (!player) throw notFound("プレイヤーが見つかりません");

    await requireTournamentOwner(player.tournament_id, user);

    const { count } = await getSupabaseAdmin()
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", player.tournament_id)
      .eq("name", trimmed)
      .neq("id", id);

    if (count && count > 0) throw conflict("同じ名前のプレイヤーが既に存在します");

    const { error } = await getSupabaseAdmin()
      .from("players")
      .update({ name: trimmed })
      .eq("id", id);

    if (error) throw internalError("変更に失敗しました");
    return { ok: true };
  });
}
