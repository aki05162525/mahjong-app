-- ================================================
-- 大会
-- ================================================
create table tournaments (
  id         text primary key default gen_random_uuid()::text,
  name       text not null check (char_length(name) <= 50),
  created_at timestamptz not null default now()
);

-- ================================================
-- プレイヤー
-- ================================================
create table players (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references tournaments(id) on delete cascade,
  name          text not null check (char_length(name) <= 20),
  created_at    timestamptz not null default now()
);

-- ================================================
-- 卓
-- ================================================
create table tables (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references tournaments(id) on delete cascade,
  name          text not null check (char_length(name) <= 20),
  created_at    timestamptz not null default now()
);

-- ================================================
-- 対局
-- ================================================
create table matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references tournaments(id) on delete cascade,
  table_id      uuid not null references tables(id),
  round_number  int not null check (round_number > 0),
  created_at    timestamptz not null default now()
);

-- ================================================
-- 対局結果（1対局につき4行）
-- ================================================
create table match_results (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  player_id   uuid not null references players(id),
  score       int not null,
  rank        int not null check (rank between 1 and 4),
  base_point  numeric not null,
  uma_point   numeric not null,
  total_point numeric not null
);

-- ================================================
-- インデックス（ランキング集計・対局一覧の高速化）
-- ================================================
create index on players (tournament_id);
create index on tables (tournament_id);
create index on matches (tournament_id, round_number);
create index on match_results (match_id);
create index on match_results (player_id);

-- ================================================
-- RLS: 全テーブルで有効化
-- ================================================
alter table tournaments  enable row level security;
alter table players      enable row level security;
alter table tables       enable row level security;
alter table matches      enable row level security;
alter table match_results enable row level security;

-- 読み取りは全員可
create policy "tournaments_read_all"    on tournaments    for select using (true);
create policy "players_read_all"        on players        for select using (true);
create policy "tables_read_all"         on tables         for select using (true);
create policy "matches_read_all"        on matches        for select using (true);
create policy "match_results_read_all"  on match_results  for select using (true);

-- 書き込みは service_role のみ（API Routes の Admin クライアントが使用）
create policy "tournaments_write_service"   on tournaments    for all using (auth.role() = 'service_role');
create policy "players_write_service"       on players        for all using (auth.role() = 'service_role');
create policy "tables_write_service"        on tables         for all using (auth.role() = 'service_role');
create policy "matches_write_service"       on matches        for all using (auth.role() = 'service_role');
create policy "match_results_write_service" on match_results  for all using (auth.role() = 'service_role');

-- ================================================
-- Data API アクセス: anon ロールに SELECT を付与
-- ================================================
grant select on tournaments   to anon;
grant select on players       to anon;
grant select on tables        to anon;
grant select on matches       to anon;
grant select on match_results to anon;
