-- ================================================
-- tournaments テーブルに owner_id を追加
-- ================================================
-- 注意: 手順 2・3 は本番 DB にて 2026-05-23 に手動実行済み。
-- このファイルを新規環境（ローカル・ステージング）で適用した場合、
-- 既存の大会がなければ nullable のままで問題ない。
-- 既存データがある環境では手順 2・3 を手動で実行すること。
-- ================================================

-- 1. owner_id カラムを nullable で追加
alter table tournaments
  add column owner_id uuid references auth.users(id);

-- 2. 既存の大会にオーナーを設定する
--    Supabase ダッシュボード > Authentication > Users で自分のユーザーIDを確認してから実行する
-- UPDATE tournaments SET owner_id = '<あなたのユーザーID>' WHERE owner_id IS NULL;

-- 3. owner_id を NOT NULL にする（手順2を実行後に行う）
-- alter table tournaments alter column owner_id set not null;
