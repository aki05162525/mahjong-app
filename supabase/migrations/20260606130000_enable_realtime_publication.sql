-- Realtime (postgres_changes) を有効化する。
--
-- なぜ必要か:
--   supabase_realtime publication にテーブルが 1 つも登録されておらず、
--   WAL の変更が Realtime に配信されていなかった。クライアントの購読は
--   SUBSCRIBED になるためエラーには見えないが、INSERT/UPDATE のイベントが
--   一切届かず、対局入力後にランキングがリロードするまで更新されなかった (#51)。
--
--   これまで publication への登録はダッシュボード操作に依存しており、
--   バージョン管理されていなかったため DB 再作成・移行で失われた。
--   以後はこのマイグレーションを唯一の真実として管理する。
--
-- 対象テーブル: アプリが postgres_changes を購読しているもの
--   matches / match_results … useMatches
--   players               … usePlayers / useMatches（名前変更の反映）
--   tables                … useTables / useMatches（卓名変更の反映）
--   rules                 … useRules
--
-- フィルタは新レコードに含まれる tournament_id で行うため、
-- REPLICA IDENTITY はデフォルト (primary key) のままで十分。

do $$
declare
  t text;
begin
  foreach t in array array['matches', 'match_results', 'players', 'tables', 'rules']
  loop
    if not exists (
      select 1
      from   pg_publication_tables
      where  pubname = 'supabase_realtime'
        and  schemaname = 'public'
        and  tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
