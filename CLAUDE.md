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

## データフロー

- **読み取り**: ブラウザ → Supabase（直接、public クライアント）
- **書き込み**: ブラウザ → Next.js API Routes → Supabase（service_role クライアント）
- クライアントから直接 DB に書き込まない。全書き込みは API Routes 経由。

## Collaboration Mode

- 新機能・修正の実装を頼まれたら、**コードを書く前に設計を確認する**
  - 「どういう設計を考えていますか？」と先に問い返す
  - ユーザーが設計を説明したら、穴や考慮漏れを質問する形で指摘する
  - ユーザーが「わからない」と言った場合のみ、選択肢を提示して選ばせる
- 実装後は「このファイルで一番大事な判断はどこですか？」など理解確認を求める
- ユーザーが明示的に「書いて」「実装して」と言った場合はそのまま実装してよい

## Git

### ブランチ

- PR を作る前に必ず feature ブランチを切る（main への直接 push は禁止されている）
- ブランチ名の例: `feat/xxx`・`fix/xxx`・`chore/xxx`

### コミットメッセージ

- What/How はコードを見れば分かる。Why（なぜその変更が必要か）を書く
- 具体的に: `Fix typo: typoedName → correctedName`（`Fix typo` だけは不十分）
- prefix で場所を示すとなお良い: `ui: Fix typo: ...`

### コミットの粒度

- 作業履歴ではなく、後から Why を遡れる単位で積む
- コードをコピーするコミットと修正するコミットは分ける（混ぜるとレビューが難しい）

### PR description

- **Why を必ず書く**: なぜこの変更が必要か・なぜそのコードになっているか
- What/How は diff で分かるので書かない

## Key Decisions

- Supabase の `service_role` キーはサーバーサイドのみ。`NEXT_PUBLIC_` に含めない。
- スコア合計が 100,000 点であることのバリデーションはサーバーサイド（API Routes）で行う。
- `match_results` テーブルに `player_id`・`table_id` を保存し、`playerName`・`tableName` は正規化して持たない。
