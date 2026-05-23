# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # 本番ビルド
pnpm lint         # ESLint
pnpm test         # テスト一度実行
pnpm test:watch   # テストウォッチ
```

単一テストファイルを実行:

```bash
pnpm vitest run src/lib/scoring.test.ts
```

## Architecture

### データフロー

- **読み取り**: ブラウザ → Supabase（直接、public クライアント）
- **書き込み**: ブラウザ → Next.js API Routes → Supabase（service_role クライアント）
- クライアントから直接 DB に書き込まない。全書き込みは API Routes 経由。

### ディレクトリ構成

- `src/app/api/` — API Routes（サーバーサイド、DB書き込み・バリデーション）
- `src/lib/` — 型定義・ビジネスロジック（スコア計算・ランキング・マッチフィルター）
- `src/infra/` — インフラ層（Supabase クライアント）
- `src/hooks/` — データ取得・リアルタイム購読のカスタムフック
- `src/components/` — UI コンポーネント（`"use client"` 前提）

### スコア計算

`src/lib/scoring.ts` に閉じている。ウマは `[30, 10, -10, -30]` 固定、同点按分あり。テストは `src/lib/scoring.test.ts`。

### 現在の移行状況

Firestore → Supabase 移行中。`docs/issues/` に issue 単位で作業内容を記載。
次のタスクは `docs/issues/001-supabase-setup.md`。

## Collaboration Mode

- 新機能・修正の実装を頼まれたら、**コードを書く前に設計を確認する**
  - 「どういう設計を考えていますか？」と先に問い返す
  - ユーザーが設計を説明したら、穴や考慮漏れを質問する形で指摘する
  - ユーザーが「わからない」と言った場合のみ、選択肢を提示して選ばせる
- 実装後は「このファイルで一番大事な判断はどこですか？」など理解確認を求める
- ユーザーが明示的に「書いて」「実装して」と言った場合はそのまま実装してよい

## Key Decisions

- Supabase の `service_role` キーはサーバーサイドのみ。`NEXT_PUBLIC_` に含めない。
- スコア合計が 100,000 点であることのバリデーションはサーバーサイド（API Routes）で行う。
- `match_results` テーブルに `player_id`・`table_id` を保存し、`playerName`・`tableName` は正規化して持たない。
