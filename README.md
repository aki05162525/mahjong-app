# 麻雀大会管理アプリ

麻雀大会の選手・卓・対局結果を管理し、ランキングをリアルタイム表示する Web アプリ。

## 技術スタック

- **フロントエンド**: Next.js (App Router) + TypeScript
- **DB / 認証**: Supabase（PostgreSQL + Supabase Auth）
- **認証プロバイダー**: Google OAuth
- **パッケージマネージャ**: pnpm

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を設定する。

```env
NEXT_PUBLIC_SUPABASE_URL=<Supabase プロジェクト URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase Publishable Key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase Service Role Key>
```

`SUPABASE_SERVICE_ROLE_KEY` は秘密鍵なので `NEXT_PUBLIC_` に含めず、サーバーサイドのみで使用すること。

### 3. 開発サーバーの起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) で確認できる。

## 主なコマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # 本番ビルド
pnpm lint         # ESLint
pnpm test         # テスト一度実行
pnpm test:watch   # テストウォッチ
```

## 機能概要

| 操作                 |       オーナー       | 誰でも |
| -------------------- | :------------------: | :----: |
| 大会作成             |   ✅（要ログイン）   |   ❌   |
| 大会・選手・卓の削除 | ✅（自分の大会のみ） |   ❌   |
| 対局入力             |          ✅          |   ✅   |
| 閲覧                 |          ✅          |   ✅   |

- ウマは `[30, 10, -10, -30]` 固定、同点按分あり
- 対局結果はリアルタイムで反映（Supabase Realtime）
