-- 本番では add_owner_id migration のコメントどおり手動適用済みだった制約を、
-- 新規環境でも再現できるよう migration 履歴へ反映する。
alter table tournaments
  alter column owner_id set not null;

-- 卓なしの単一卓モードを生成型でも表現できるよう、p_table_id をデフォルト付きの
-- 末尾引数にする。RPC は名前付き引数で呼ぶため、呼び出し互換性は維持される。
drop function create_match_with_results(text, uuid, int, uuid, int[], int, jsonb);

create function create_match_with_results(
  p_tournament_id text,
  p_round_number  int,
  p_rule_id       uuid,
  p_uma           int[],
  p_return_points int,
  p_results       jsonb,
  p_table_id      uuid default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_match_id uuid;
begin
  insert into matches (tournament_id, table_id, round_number, rule_id, uma, return_points)
  values (p_tournament_id, p_table_id, p_round_number, p_rule_id, p_uma, p_return_points)
  returning id into v_match_id;

  insert into match_results (match_id, tournament_id, player_id, score, rank, base_point, uma_point, oka_point, total_point)
  select
    v_match_id,
    p_tournament_id,
    r.player_id,
    r.score,
    r.rank,
    r.base_point,
    r.uma_point,
    r.oka_point,
    r.total_point
  from jsonb_to_recordset(p_results) as r(
    player_id   uuid,
    score       int,
    rank        int,
    base_point  numeric,
    uma_point   numeric,
    oka_point   numeric,
    total_point numeric
  );

  return v_match_id;
end;
$$;

revoke execute on function create_match_with_results(text, int, uuid, int[], int, jsonb, uuid) from public, anon, authenticated;
grant execute on function create_match_with_results(text, int, uuid, int[], int, jsonb, uuid) to service_role;
