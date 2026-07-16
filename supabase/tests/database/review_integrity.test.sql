begin;

select plan(15);

insert into auth.users (id)
values ('00000000-0000-4000-8000-000000000001');

insert into tournaments (id, name, owner_id)
values ('review-test', 'Review Test', '00000000-0000-4000-8000-000000000001');

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'players_tournament_id_name_key'
      and conrelid = 'players'::regclass
      and contype = 'u'
  ),
  'players are unique by tournament and name'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'tables_tournament_id_name_key'
      and conrelid = 'tables'::regclass
      and contype = 'u'
  ),
  'tables are unique by tournament and name'
);

insert into rules (id, tournament_id, name, uma, return_points, is_default)
values (
  '00000000-0000-4000-8000-000000000010',
  'review-test',
  'Original',
  array[20, 10, -10, -20],
  30000,
  true
);

select ok(
  create_rule_atomic(
    'review-test',
    'New Default',
    array[30, 10, -10, -30],
    30000,
    true
  ) is not null,
  'creating a default rule succeeds'
);

select is(
  (select count(*)::int from rules where tournament_id = 'review-test' and is_default),
  1,
  'exactly one default remains after create'
);

select ok(
  (select not is_default from rules where id = '00000000-0000-4000-8000-000000000010'),
  'the previous default is cleared'
);

select is(
  update_rule_atomic(
    (select id from rules where tournament_id = 'review-test' and name = 'New Default'),
    'review-test',
    'Renamed Default',
    array[30, 10, -10, -30],
    30000
  ),
  'updated',
  'omitting isDefault updates the rule'
);

select ok(
  (select is_default from rules where tournament_id = 'review-test' and name = 'Renamed Default'),
  'omitting isDefault preserves the current default'
);

select is(
  update_rule_atomic(
    (select id from rules where tournament_id = 'review-test' and name = 'Renamed Default'),
    'review-test',
    'Renamed Default',
    array[30, 10, -10, -30],
    30000,
    false
  ),
  'default_required',
  'the current default cannot be disabled directly'
);

select ok(
  (select is_default from rules where tournament_id = 'review-test' and name = 'Renamed Default'),
  'a rejected default disable leaves the default intact'
);

select is(
  delete_rule_if_not_default(
    (select id from rules where tournament_id = 'review-test' and name = 'Renamed Default'),
    'review-test'
  ),
  'default_required',
  'the default rule cannot be deleted'
);

insert into rules (id, tournament_id, name, uma, return_points, is_default)
values (
  '00000000-0000-4000-8000-000000000011',
  'review-test',
  'Deletable',
  array[10, 5, -5, -10],
  25000,
  false
);

select is(
  delete_rule_if_not_default('00000000-0000-4000-8000-000000000011', 'review-test'),
  'deleted',
  'a non-default rule can be deleted'
);

select is(
  (select count(*)::int from rules where id = '00000000-0000-4000-8000-000000000011'),
  0,
  'the non-default rule is removed'
);

insert into tables (id, tournament_id, name)
values ('00000000-0000-4000-8000-000000000020', 'review-test', 'A');

insert into matches (id, tournament_id, table_id, round_number, uma, return_points)
values
  ('00000000-0000-4000-8000-000000000030', 'review-test', null, 1, array[20, 10, -10, -20], 30000),
  ('00000000-0000-4000-8000-000000000031', 'review-test', null, 2, array[20, 10, -10, -20], 30000),
  ('00000000-0000-4000-8000-000000000032', 'review-test', '00000000-0000-4000-8000-000000000020', 2, array[20, 10, -10, -20], 30000);

select lives_ok(
  $$ select delete_match_and_renumber('00000000-0000-4000-8000-000000000030', 'review-test') $$,
  'deleting a match and renumbering succeeds'
);

select is(
  (select round_number from matches where id = '00000000-0000-4000-8000-000000000031'),
  1,
  'a later NULL-table match is renumbered'
);

select is(
  (select round_number from matches where id = '00000000-0000-4000-8000-000000000032'),
  2,
  'a match assigned to another table is not renumbered'
);

select * from finish();

rollback;
