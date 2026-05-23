# #008 src/lib 配下のリファクタリング

## 概要

`src/lib/` 配下のファイルの責務が混在しているため、ファイル分割・整理を行う。

## 背景

現状の問題点：
- `types.ts` に型定義・ランキング計算・使用済みプレイヤー取得の3つが混在している
- `src/lib/` に DB クライアント（Supabase）とビジネスロジックが同居している
- テストファイル（`ranking.test.ts`, `matchFilter.test.ts`）が示す分割が実装に反映されていない

## やること

### 1. `types.ts` の分割

| 移動先 | 内容 |
|--------|------|
| `src/lib/types.ts`（残す） | 型定義のみ（`Tournament`, `Player`, `Table`, `Match`, `RankingEntry`） |
| `src/lib/ranking.ts`（新規） | `buildRanking` 関数 |
| `src/lib/matchFilter.ts`（新規） | `getUsedPlayerIds` 関数 |

### 2. Supabase クライアントの移動

`supabase.ts` と `supabase-admin.ts` を `src/lib/` 直下から `src/lib/supabase/` または `src/supabase/` に移動する。

> **未決定**: ディレクトリを `src/lib/supabase/` と `src/supabase/` どちらにするか要確認。

`database.types.ts` は Supabase CLI の自動生成対象のため `src/lib/` に残す。

### 3. import パスの修正

分割・移動後、参照しているすべてのファイルの import を修正する。

## 完了条件

- [ ] `src/lib/ranking.ts` が存在し `buildRanking` が含まれている
- [ ] `src/lib/matchFilter.ts` が存在し `getUsedPlayerIds` が含まれている
- [ ] `src/lib/types.ts` に型定義のみが残っている
- [ ] Supabase クライアント2ファイルが移動されている
- [ ] `npm run build` と `npm run test` が通る

## 依存

なし
