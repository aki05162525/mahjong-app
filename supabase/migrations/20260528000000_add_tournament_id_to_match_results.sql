-- match_results に tournament_id を追加して Realtime フィルタリングを可能にする
-- matches.tournament_id を経由した JOIN でしか導出できないため、
-- Supabase Realtime のカラムフィルタに使えるよう非正規化して保持する

alter table match_results
  add column tournament_id text references tournaments(id) on delete cascade;

-- 既存レコードをバックフィル
update match_results mr
set    tournament_id = m.tournament_id
from   matches m
where  mr.match_id = m.id;

-- バックフィル後に NOT NULL 制約を追加
alter table match_results
  alter column tournament_id set not null;

-- Realtime フィルタ・ランキング集計の高速化
create index on match_results (tournament_id);
