# #004 Matches API Routes 移行

## 概要

対局結果の保存・削除を API Routes 経由に移行し、サーバーサイドバリデーションを実装する。

## やること

### 新規 API Routes の作成

```
/api/matches/save/route.ts
/api/matches/delete/route.ts
```

### `/api/matches/save` のバリデーション

- `roundNumber` が正の整数であること
- `tableId` が存在する卓であること
- `inputs` が4件であること
- `inputs` 内の `playerId` が重複していないこと
- `inputs` 内の `playerId` が全て当該大会のプレイヤーであること
- スコアの合計が 100,000 点であること
- 各スコアが数値であること

### 対局保存のデータ構造変更

Firestore では `results[]` に `playerName`・`tableName` を埋め込んでいたが、
Supabase では正規化されたテーブルに保存する。

```ts
// matches テーブルに1行
const match = await supabase.from("matches").insert({
  tournament_id: tournamentId,
  table_id: tableId,       // tableName ではなく tableId を保存
  round_number: roundNumber,
}).select().single();

// match_results テーブルに4行
const results = inputs.map((input) => ({
  match_id: match.id,
  player_id: input.playerId,  // playerName ではなく playerId を保存
  score: input.score,
  rank: ...,
  base_point: ...,
  uma_point: ...,
  total_point: ...,
}));
await supabase.from("match_results").insert(results);
```

### ランキング・履歴表示の JOIN 対応

- `match_results` を取得する際に `players` テーブルを JOIN して `playerName` を解決する
- `matches` を取得する際に `tables` テーブルを JOIN して `tableName` を解決する
- `src/lib/firestore.ts` の `buildRanking` を Supabase 用に書き直す

### hooks の修正

- `src/hooks/useMatches.ts`: 書き込み時に API Routes を呼ぶように変更

## 完了条件

- [ ] 対局結果保存が API Routes 経由で動作する
- [ ] 対局削除が API Routes 経由で動作する
- [ ] スコア合計・重複プレイヤーのサーバーサイドバリデーションが動作する
- [ ] `table_id` / `player_id` で正規化されて保存される
- [ ] ランキング・履歴表示が JOIN で正しく表示される
- [ ] クライアントから Firestore への直接書き込みが消えている（matches）

## 依存

- #001 #003 完了後に実施（players・tables が存在する必要がある）
