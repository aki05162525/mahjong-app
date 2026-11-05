-- 回戦番号は大会の目印として手動修正・飛び番を許すため、削除で他の対局を再採番しない。
-- 既存 API との互換性のため RPC 名は維持する。
create or replace function delete_match_and_renumber(
  p_match_id uuid,
  p_tournament_id text
) returns void
language plpgsql
security invoker
as $$
begin
  -- match_results の複合 FK に ON DELETE CASCADE がないため、結果を先に削除する。
  delete from match_results
  where match_id = p_match_id
    and tournament_id = p_tournament_id;

  delete from matches
  where id = p_match_id
    and tournament_id = p_tournament_id;

  if not found then
    raise exception 'match not found';
  end if;
end;
$$;

revoke execute on function delete_match_and_renumber(uuid, text) from public, anon, authenticated;
grant execute on function delete_match_and_renumber(uuid, text) to service_role;
