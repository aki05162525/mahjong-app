# #011 `match_results` に `tournament_id` を追加して Realtime フィルターを有効化

## 概要

現在 `resultsChannel` は `match_results` テーブル全体を購読しており、他の大会への試合登録でも `fetchMatches()` が走る。

原因は `match_results` に `tournament_id` カラムがないこと。
テーブル構造が `tournaments → matches（tournament_id あり）→ match_results（match_id あり）` となっており、
Supabase Realtime のフィルターはそのテーブルのカラムにしか使えないため、現状では絞り込めない。

`tournament_id` を追加して `tournament_id=eq.${tournamentId}` フィルターを有効にする。

## やること

### 1. DBマイグレーション

```sql
ALTER TABLE match_results
  ADD COLUMN tournament_id uuid REFERENCES tournaments(id);

-- 既存データのバックフィル
UPDATE match_results mr
SET tournament_id = m.tournament_id
FROM matches m
WHERE mr.match_id = m.id;

-- バックフィル後に NOT NULL 制約を追加
ALTER TABLE match_results
  ALTER COLUMN tournament_id SET NOT NULL;
```

### 2. API Route の更新

`/api/matches` の INSERT 処理で `tournament_id` もセットする。

### 3. `useMatches.ts` の更新

`resultsChannel` のサブスクリプションにフィルターを追加する。

```ts
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'match_results',
  filter: `tournament_id=eq.${tournamentId}`,
}, handler)
```

## トレードオフ

`tournament_id` は `matches` を経由すれば導出できるため、厳密には正規化の重複になる。
しかしフィルタリングのためのトレードオフとして合理的（`docs/interview-realtime-sync.md` 参照）。

## 完了条件

- [ ] 別の大会に試合を登録したとき、当該ページで `fetchMatches` が呼ばれない
- [ ] 自分の大会に試合を登録したとき、正常に画面が更新される
- [ ] `pnpm build` と `pnpm test` が通る

## 依存

\#010 のデバウンスが入っていると効果を確認しやすいが、独立して実施可能
