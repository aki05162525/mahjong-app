# [Umbrella] Firestore → Supabase 移行

## 目的

現状の Firestore 構成から Supabase + Next.js API Routes 構成に移行する。  
これにより `docs/security-and-architecture-review.md` で指摘した問題の大半を解消する。

## 解消される問題

| 問題 | 対応 issue |
|---|---|
| Firestoreクライアント直書き | #003 #004 #005 |
| Security Rules の問題 | #001 (RLS で置き換え) |
| バッチ500件上限 | #001 (PostgreSQL では不要) |
| データ非正規化 | #001 (テーブル設計時に正規化) |
| サーバーサイドバリデーション欠如 | #003 #004 #005 |
| レート制限なし | #002 |

## issue 一覧・実施順序

```
#001 Supabase セットアップ + スキーマ設計
  ↓
#002 Tournament API Routes 移行
  ↓
#003 Players / Tables API Routes 移行
  ↓
#004 Matches API Routes 移行
  ↓
#005 リアルタイム購読の移行（Supabase Realtime）
  ↓
#006 Firebase 依存の完全削除
```

※ #007 Sentry 導入 は上記とは独立しており任意のタイミングで実施可能

## 完了条件

- [ ] Firestore / Firebase への依存がコードから完全に消えている
- [ ] 全書き込み操作が API Routes 経由になっている
- [ ] Supabase RLS により直接書き込みが拒否される
- [ ] リアルタイム同期が Supabase Realtime で動作している
- [ ] Sentry でエラーが補足される
