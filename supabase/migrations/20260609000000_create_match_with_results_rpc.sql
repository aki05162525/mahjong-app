-- 対局作成をトランザクション 1 本に寄せる
-- matches insert + match_results insert が分離していたため、
-- match_results 失敗時にアプリ側で matches を手動 delete する補償処理が必要だった。
-- DB 関数に寄せることでトランザクションが自動的に整合性を保証する。
create or replace function create_match_with_results(
  p_tournament_id text,
  p_table_id      uuid,
  p_round_number  int,
  p_rule_id       uuid,
  p_uma           int[],
  p_return_points int,
  p_results       jsonb
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

revoke execute on function create_match_with_results(text, uuid, int, uuid, int[], int, jsonb) from public, anon, authenticated;
grant  execute on function create_match_with_results(text, uuid, int, uuid, int[], int, jsonb) to service_role;
