# #001 Supabase セットアップ + スキーマ設計

## 概要

Supabase プロジェクトを作成し、テーブル設計・RLS 設定・クライアントのセットアップを行う。  
後続のすべての issue の前提となる。

## やること

### テーブル設計

現状の Firestore 構造（非正規化）から PostgreSQL の正規化された設計に変える。

```sql
-- 大会
create table tournaments (
  id         text primary key default gen_random_uuid()::text,
  name       text not null check (char_length(name) <= 50),
  created_at timestamptz not null default now()
);

-- プレイヤー
create table players (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references tournaments(id) on delete cascade,
  name          text not null check (char_length(name) <= 20),
  created_at    timestamptz not null default now()
);

-- 卓
create table tables (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references tournaments(id) on delete cascade,
  name          text not null check (char_length(name) <= 20),
  created_at    timestamptz not null default now()
);

-- 対局
create table matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id text not null references tournaments(id) on delete cascade,
  table_id      uuid not null references tables(id),
  round_number  int not null check (round_number > 0),
  created_at    timestamptz not null default now()
);

-- 対局結果（1対局につき4行）
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
```

**Firestore との主な差分:**
- `tableName: string` → `table_id: uuid`（正規化）
- `playerName: string` → `player_id: uuid`（正規化）
- `results[]` を `match_results` テーブルとして分離

### RLS 設定

```sql
-- 読み取りは全員可
alter table tournaments enable row level security;
create policy "read_all" on tournaments for select using (true);

-- 書き込みは service_role のみ（API Routes から Admin クライアントで操作）
create policy "write_service" on tournaments for all using (auth.role() = 'service_role');

-- players / tables / matches / match_results も同様
```

### クライアントセットアップ

- `@supabase/supabase-js` をインストール
- `src/lib/supabase.ts` を作成（ブラウザ用 public クライアント、読み取り専用で使用）
- `src/lib/supabase-admin.ts` を作成（API Routes 用 service_role クライアント）
- `.env.local` に `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` を追加

## 完了条件

- [ ] Supabase プロジェクトが作成されている
- [ ] 全テーブルが作成されている
- [ ] RLS が設定されている（service_role 以外の書き込みが拒否される）
- [ ] `src/lib/supabase.ts` と `src/lib/supabase-admin.ts` が存在する
- [ ] 環境変数が `.env.local` と Vercel に設定されている

## 依存

なし（最初に実施）
