---
name: supabase-migrate
description: "Supabase マイグレーションを作成・適用するときに使う。新しい migration ファイルを書く、既存の migration を修正する、supabase db push でリモートに適用する、型を再生成する、といった操作が対象。"
metadata:
  author: local
  version: "0.2.0"
---

# Supabase Migration (このプロジェクト固有)

## 前提知識（調べ直し不要）

- **ローカル Supabase は存在しない**。`supabase/config.toml` がないため `supabase start` / `supabase status` は使えない。確認しない。
- **プロジェクトはリンク済み**。`supabase/.temp/project-ref` に `djvvfgwsbqsyznwxdmzx` が記録されている。`supabase db push` はデフォルトで `--linked` なのでオプション不要。
- **マイグレーションはリモートに直接 push する**。`supabase db push` のみ。

## Migration ファイルの作り方

`supabase migration new <description>` を使う。現在のタイムスタンプで自動命名されるため、手動でタイムスタンプを作るより事故が少ない。

```bash
supabase migration new create_match_with_results
# → supabase/migrations/YYYYMMDDHHmmss_create_match_with_results.sql が生成される
```

生成されたファイルに SQL を書く。

## 標準フロー

### 1. Migration ファイルを作る

```bash
supabase migration new <snake_case_description>
```

### 2. SQL をレビューする

push 前に内容を確認する。特に：

- `DROP` や `ALTER` を含む破壊的変更はユーザーに確認を取る
- RLS ポリシー・`GRANT` / `REVOKE` が意図通りか確認する
- Postgres 関数は `security invoker` か `security definer` かを確認する

### 3. Dry-run で適用対象を確認する

```bash
supabase db push --dry-run
```

適用予定の migration ファイル一覧が表示される。意図しないファイルが含まれていないか確認する。

### 4. Push する

```bash
supabase db push
```

エラーが出た場合は SQL の構文・依存関係（存在しないテーブルや型への参照）を確認する。

### 5. 型を再生成する（スキーマ変更があった場合）

テーブル・カラム・Postgres 関数の追加・変更があった場合は必ず実行する：

```bash
supabase gen types typescript --linked > src/lib/database.types.ts
```

データのみの変更・コメント追加など、スキーマに変化がない場合は不要。

## やらないこと

- `supabase start` / `supabase stop` / `supabase status`（ローカルインスタンスはない）
- `--project-ref` オプションの使用（`db push` に存在しない。リンク済みなので不要）
- タイムスタンプの手動生成（`supabase migration new` に任せる）
