# #007 Sentry 導入

## 概要

本番環境のエラーを検知・通知するために Sentry を導入する。  
他の issue とは独立しており、任意のタイミングで実施可能。

## やること

### インストール

```bash
npm install @sentry/nextjs
```

### 設定ファイルの作成

`@sentry/nextjs` のウィザードを使うか、手動で以下を作成する。

```
sentry.client.config.ts   # ブラウザ側の初期化
sentry.server.config.ts   # サーバー側の初期化
sentry.edge.config.ts     # Edge Runtime の初期化
```

```ts
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### next.config.ts の修正

```ts
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = { ... };

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "your-org",
  project: "mahjong-app",
});
```

### 環境変数の追加

- `NEXT_PUBLIC_SENTRY_DSN`: Sentry プロジェクトの DSN
- Vercel の環境変数にも追加

### エラー境界の追加（オプション）

予期しないクライアントエラーを Sentry に送るため、`src/app/error.tsx` を作成する。

## 完了条件

- [ ] `@sentry/nextjs` がインストールされている
- [ ] 本番環境でエラーが発生したとき Sentry ダッシュボードに記録される
- [ ] `NEXT_PUBLIC_SENTRY_DSN` が Vercel に設定されている
- [ ] ビルドが通る

## 依存

なし（独立して実施可能）
