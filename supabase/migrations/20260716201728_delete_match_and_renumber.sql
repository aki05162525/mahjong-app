-- 対局削除と後続回戦の再採番を同一トランザクションで行う。
create or replace function delete_match_and_renumber(
  p_match_id uuid,
  p_tournament_id text
) returns void
language plpgsql
security invoker
as $$
declare
  v_round int;
  v_table_id uuid;
begin
  delete from matches
  where id = p_match_id
    and tournament_id = p_tournament_id
  returning round_number, table_id into v_round, v_table_id;

  if not found then
    raise exception 'match not found';
  end if;

  -- NULLを含め、同じ卓に属する後続対局だけを再採番する。
  update matches
  set round_number = round_number - 1
  where tournament_id = p_tournament_id
    and table_id is not distinct from v_table_id
    and round_number > v_round;
end;
$$;

revoke execute on function delete_match_and_renumber(uuid, text) from public, anon, authenticated;
grant execute on function delete_match_and_renumber(uuid, text) to service_role;
