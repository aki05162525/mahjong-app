-- ================================================
-- tournaments テーブルに owner_id を追加
-- ================================================

-- 1. owner_id カラムを nullable で追加
alter table tournaments
  add column owner_id uuid references auth.users(id);

-- 2. 既存の大会にオーナーを設定する
--    Supabase ダッシュボード > Authentication > Users で自分のユーザーIDを確認してから実行する
-- UPDATE tournaments SET owner_id = '<あなたのユーザーID>' WHERE owner_id IS NULL;

-- 3. owner_id を NOT NULL にする（手順2を実行後に行う）
-- alter table tournaments alter column owner_id set not null;
