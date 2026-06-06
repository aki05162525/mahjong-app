-- ================================================
-- ルール（ウマ・返し点）を対局ごとに設定可能にする
-- ================================================
-- 背景:
--   これまでウマ [30,10,-10,-30]・返し点25000（オカなし）がハードコードだった。
--   大会ごとに複数ルールを登録し、対局ごとに選べるようにする。
--   持ち点は4人麻雀の合計100,000点固定なので25000とし、可変なのはウマと返し点。
-- ================================================

-- ------------------------------------------------
-- rules テーブル（大会ごとのルール定義）
-- ------------------------------------------------
create table rules (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references tournaments(id) on delete cascade,
  name          text not null check (char_length(name) <= 30),
  uma           int[] not null check (
    cardinality(uma) = 4 and uma[1] + uma[2] + uma[3] + uma[4] = 0
  ),
  return_points int not null check (return_points >= 25000),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index on rules (tournament_id);

-- 大会内でデフォルトは高々1つ（部分一意インデックスで DB レベルに保証）
create unique index rules_one_default_per_tournament
  on rules (tournament_id) where (is_default);

-- ------------------------------------------------
-- matches: 使ったルールのスナップショット
-- ------------------------------------------------
-- rule_id は「どのルールか」の参照（後で編集・削除されても履歴の値はスナップショットで保持）。
-- 対局後にルールが削除されても履歴を壊さないため ON DELETE SET NULL。
alter table matches
  add column rule_id       uuid references rules(id) on delete set null,
  add column uma           int[],
  add column return_points int;

-- ------------------------------------------------
-- match_results: オカ点
-- ------------------------------------------------
-- 既存行はオカなし（0）。返し点>25000 のときトップ群が受け取る。
alter table match_results
  add column oka_point numeric not null default 0;

-- ================================================
-- 既存データの移行
-- ================================================
-- 既存大会に標準ルールを seed（新規大会はアプリ側の作成フローで同じものを seed する）。
insert into rules (tournament_id, name, uma, return_points, is_default)
  select id, '10-20（ワンツー）', array[20, 10, -10, -20], 30000, true from tournaments;
insert into rules (tournament_id, name, uma, return_points, is_default)
  select id, '10-30', array[30, 10, -10, -30], 30000, false from tournaments;
insert into rules (tournament_id, name, uma, return_points, is_default)
  select id, 'ウマなし', array[0, 0, 0, 0], 25000, false from tournaments;
-- これまでの挙動（ウマ10-30・返し25000・オカなし）に対応するルール。既存対局を紐付ける。
insert into rules (tournament_id, name, uma, return_points, is_default)
  select id, '10-30（返し25000）', array[30, 10, -10, -30], 25000, false from tournaments;

-- 既存対局を当時の挙動でスナップショットし、現行ルールに紐付ける。
update matches m
set uma           = array[30, 10, -10, -30],
    return_points = 25000,
    rule_id       = (
      select r.id from rules r
      where r.tournament_id = m.tournament_id
        and r.name = '10-30（返し25000）'
      limit 1
    )
where m.uma is null;

-- 移行後は対局に必ずルールスナップショットが乗る（アプリの全 insert が値を渡す）。
alter table matches alter column uma           set not null;
alter table matches alter column return_points set not null;

-- ================================================
-- RLS / 権限（既存テーブルと同じ方針）
-- ================================================
alter table rules enable row level security;

create policy "rules_read_all"      on rules for select using (true);
create policy "rules_write_service" on rules for all    using (auth.role() = 'service_role');

grant select on rules to anon;
