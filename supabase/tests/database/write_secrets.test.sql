begin;

select plan(6);

-- テーブルが存在し RLS が有効
select has_table('tournament_write_secrets');

select ok(
  (select relrowsecurity from pg_class where oid = 'tournament_write_secrets'::regclass),
  'RLS is enabled on tournament_write_secrets'
);

-- anon / authenticated からは Data API 経由で一切読み書きできない
select ok(
  not has_table_privilege('anon', 'tournament_write_secrets', 'SELECT'),
  'anon cannot SELECT tournament_write_secrets'
);

select ok(
  not has_table_privilege('anon', 'tournament_write_secrets', 'INSERT, UPDATE, DELETE'),
  'anon cannot write tournament_write_secrets'
);

select ok(
  not has_table_privilege('authenticated', 'tournament_write_secrets', 'SELECT, INSERT, UPDATE, DELETE'),
  'authenticated cannot access tournament_write_secrets'
);

-- 大会削除でシークレットも消える（cascade）
insert into auth.users (id)
values ('00000000-0000-4000-8000-000000000002');

insert into tournaments (id, name, owner_id)
values ('secret-test', 'Secret Test', '00000000-0000-4000-8000-000000000002');

insert into tournament_write_secrets (tournament_id, token_hash)
values ('secret-test', 'dummy-hash');

delete from tournaments where id = 'secret-test';

select is(
  (select count(*)::int from tournament_write_secrets where tournament_id = 'secret-test'),
  0,
  'deleting a tournament cascades to its write secret'
);

select * from finish();

rollback;
