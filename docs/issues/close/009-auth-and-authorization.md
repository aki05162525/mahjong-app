# #009 認証・認可の導入（Supabase Auth + Google OAuth）

## 概要

現状の `ADMIN_PASSWORD` 一本によるアクセス制御を廃止し、Supabase Auth + Google OAuth を使った認証・認可に移行する。

設計の詳細は `docs/adr/0001-google-oauth-only.md`・`docs/adr/0002-match-input-no-auth.md` を参照。

## ロールと操作権限

| 操作 | オーナー | 誰でも（認証不要） |
|------|:--------:|:-----------------:|
| 大会作成 | ✅（ログイン必須） | ❌ |
| 大会削除 | ✅（自分の大会のみ） | ❌ |
| 選手・卓の登録・削除 | ✅（自分の大会のみ） | ❌ |
| 対局入力 | ✅ | ✅ |
| 対局削除 | ✅（自分の大会のみ） | ❌ |
| 閲覧 | ✅ | ✅ |

## やること

### 1. Supabase Auth の設定

- Supabase ダッシュボードで Google OAuth プロバイダーを有効化
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` は既存のものを流用
- Google Cloud Console でOAuthクライアントIDを発行し、Supabase に設定

### 2. DBマイグレーション

`tournaments` テーブルに `owner_id` カラムを追加する。

```sql
ALTER TABLE tournaments
  ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- 既存大会は自分のユーザーIDをオーナーに設定（B案）
-- マイグレーション実行前に自分のユーザーIDを確認してから実行する
UPDATE tournaments SET owner_id = '<自分のユーザーID>' WHERE owner_id IS NULL;

-- 追加後は NOT NULL 制約を付ける
ALTER TABLE tournaments
  ALTER COLUMN owner_id SET NOT NULL;
```

### 3. RLS ポリシーの更新

```sql
-- tournaments: 誰でも読める、作成はログイン済みのみ、削除はオーナーのみ
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments: anyone can read"
  ON tournaments FOR SELECT USING (true);

CREATE POLICY "tournaments: authenticated can insert"
  ON tournaments FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "tournaments: owner can delete"
  ON tournaments FOR DELETE
  USING (auth.uid() = owner_id);

-- players・tables: オーナーのみ書き込み可
CREATE POLICY "players: owner can insert"
  ON players FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM tournaments WHERE id = tournament_id)
  );

CREATE POLICY "players: owner can delete"
  ON players FOR DELETE
  USING (
    auth.uid() = (SELECT owner_id FROM tournaments WHERE id = tournament_id)
  );

-- 同様に tables テーブルにも追加

-- matches・match_results: 誰でも insert 可、削除はオーナーのみ
CREATE POLICY "matches: anyone can insert"
  ON matches FOR INSERT WITH CHECK (true);

CREATE POLICY "matches: owner can delete"
  ON matches FOR DELETE
  USING (
    auth.uid() = (SELECT owner_id FROM tournaments WHERE id = tournament_id)
  );
```

### 4. `@supabase/ssr` の導入とクライアント整理

```bash
pnpm add @supabase/ssr
```

- `src/infra/supabase.ts` を `@supabase/ssr` の `createBrowserClient` に変更
- `src/infra/supabase-server.ts` を新規作成（Server Components / Route Handlers 用）

### 5. API Routes の認証ガード

**`/api/create-tournament`**
- リクエストから Supabase セッションを取得
- 未ログインなら 401 を返す
- `owner_id` に `session.user.id` をセットしてインサート
- `ADMIN_PASSWORD` チェックを削除

**`/api/delete-tournament`**
- セッションの `user.id` と `tournaments.owner_id` を照合
- 一致しなければ 403 を返す
- `ADMIN_PASSWORD` チェックを削除

**`/api/players`・`/api/tables`（登録・削除）**
- セッションの `user.id` と対象大会の `owner_id` を照合
- 一致しなければ 403

**`/api/matches`（入力）**
- 認証チェックなし（誰でも可）のまま維持

### 6. トップページ（`src/app/page.tsx`）の更新

- パスワード入力フォームを削除
- ログイン状態に応じて表示を切り替える
  - **未ログイン**: 「Googleでログインして大会を作る」ボタン
  - **ログイン済み**: 大会作成フォーム ＋ 自分の大会一覧

自分の大会一覧は `tournaments` を `owner_id = 現在のユーザーID` でフィルタして取得する。

### 7. 大会ページ（`src/app/[tournamentId]/page.tsx`）の更新

- 大会データ取得時に `owner_id` も取得する
- ログイン中のユーザーIDと `owner_id` が一致する場合のみ管理UI（選手・卓登録、削除ボタン）を表示
- 対局入力フォームは全員に表示したまま維持

## 完了条件

- [ ] Google OAuth でログイン・ログアウトができる
- [ ] ログイン済みユーザーのみ大会を作成できる（API・UI 両方）
- [ ] 大会オーナーのみ選手・卓の登録削除、対局削除、大会削除ができる
- [ ] 対局入力は未ログインでも可能なまま
- [ ] 大会ページで非オーナーに管理UIが表示されない
- [ ] ログイン後のトップページに自分の大会一覧が表示される
- [ ] 既存大会に `owner_id` が設定されている
- [ ] `ADMIN_PASSWORD` によるチェックがコードから消えている
- [ ] `pnpm build` と `pnpm test` が通る

## 依存

なし（他の issue とは独立して実施可能）
