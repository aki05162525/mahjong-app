# ウマオカ

みんなでつける、麻雀の成績表。

麻雀大会の選手・卓・対局結果を管理し、ランキングをリアルタイム表示する Web アプリ。

本番環境: [umaoka.app](https://umaoka.app)

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

### 2. 1Password CLI のセットアップ

[1Password CLI](https://developer.1password.com/docs/cli/get-started/) をインストールし、サインインする。

```bash
op signin --account my.1password.com
```

シークレットは 1Password の `mahjong-app` Vault で管理している。`.env` に `op://` 参照が書かれており、`pnpm dev` 実行時に自動で注入される。

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
