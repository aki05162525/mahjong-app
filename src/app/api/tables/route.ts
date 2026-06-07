import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/infra/supabase-admin";
import { route } from "@/server/http/route";
import { badRequest, conflict, internalError } from "@/server/http/errors";
import { requireUser } from "@/server/auth/requireUser";
import { requireTournamentOwner } from "@/server/auth/requireTournamentOwner";

export async function POST(req: NextRequest) {
  return route(async () => {
    await requireUser();

    const { tournamentId, name } = await req.json();

    if (!tournamentId) throw badRequest("大会IDが必要です");

    await requireTournamentOwner(tournamentId);

    const trimmed = (name ?? "").trim();
    if (!trimmed) throw badRequest("卓名を入力してください");
    if (trimmed.length > 20) throw badRequest("卓名は20文字以内で入力してください");

    const { count } = await getSupabaseAdmin()
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("name", trimmed);

    if (count && count > 0) throw conflict("同じ名前の卓が既に存在します");

    const { data, error } = await getSupabaseAdmin()
      .from("tables")
      .insert({ tournament_id: tournamentId, name: trimmed })
      .select("id")
      .single();

    if (error) throw internalError("登録に失敗しました");
    return { id: data.id };
  });
}
