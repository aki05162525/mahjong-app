-- 同時リクエストでも大会内のプレイヤー名・卓名が重複しないようDBで保証する。
alter table players
  add constraint players_tournament_id_name_key unique (tournament_id, name);

alter table tables
  add constraint tables_tournament_id_name_key unique (tournament_id, name);

-- デフォルト解除とルール作成を同一トランザクションで行う。
create function create_rule_atomic(
  p_tournament_id text,
  p_name text,
  p_uma int[],
  p_return_points int,
  p_is_default boolean
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_rule_id uuid;
begin
  if p_is_default then
    update rules
    set is_default = false
    where tournament_id = p_tournament_id
      and is_default = true;
  end if;

  insert into rules (tournament_id, name, uma, return_points, is_default)
  values (p_tournament_id, p_name, p_uma, p_return_points, p_is_default)
  returning id into v_rule_id;

  return v_rule_id;
end;
$$;

-- isDefaultがNULLなら現在値を維持する。現在のデフォルトを明示的にfalseへ
-- 変更する操作は、大会からデフォルトが消えるため拒否する。
create function update_rule_atomic(
  p_rule_id uuid,
  p_tournament_id text,
  p_name text,
  p_uma int[],
  p_return_points int,
  p_is_default boolean default null
) returns text
language plpgsql
security invoker
as $$
declare
  v_is_default boolean;
begin
  select is_default into v_is_default
  from rules
  where id = p_rule_id
    and tournament_id = p_tournament_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_is_default and p_is_default is false then
    return 'default_required';
  end if;

  if p_is_default is true then
    update rules
    set is_default = false
    where tournament_id = p_tournament_id
      and is_default = true
      and id <> p_rule_id;
  end if;

  update rules
  set name = p_name,
      uma = p_uma,
      return_points = p_return_points,
      is_default = coalesce(p_is_default, is_default)
  where id = p_rule_id;

  return 'updated';
end;
$$;

-- 判定と削除を同じスナップショット・トランザクション内で行う。
create function delete_rule_if_not_default(
  p_rule_id uuid,
  p_tournament_id text
) returns text
language plpgsql
security invoker
as $$
declare
  v_rule_id uuid;
begin
  delete from rules
  where id = p_rule_id
    and tournament_id = p_tournament_id
    and is_default = false
  returning id into v_rule_id;

  if found then
    return 'deleted';
  end if;

  if exists (
    select 1 from rules
    where id = p_rule_id
      and tournament_id = p_tournament_id
      and is_default = true
  ) then
    return 'default_required';
  end if;

  return 'not_found';
end;
$$;

revoke execute on function create_rule_atomic(text, text, int[], int, boolean) from public, anon, authenticated;
revoke execute on function update_rule_atomic(uuid, text, text, int[], int, boolean) from public, anon, authenticated;
revoke execute on function delete_rule_if_not_default(uuid, text) from public, anon, authenticated;

grant execute on function create_rule_atomic(text, text, int[], int, boolean) to service_role;
grant execute on function update_rule_atomic(uuid, text, text, int[], int, boolean) to service_role;
grant execute on function delete_rule_if_not_default(uuid, text) to service_role;
