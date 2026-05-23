# #005 リアルタイム購読の移行（Supabase Realtime）

## 概要

Firestore の `onSnapshot` を Supabase Realtime に置き換える。  
誰かがデータを更新したとき、他のユーザーの画面が自動で更新される挙動を維持する。

## やること

### 現状の `onSnapshot` との対応

| 現状 (Firestore) | 移行後 (Supabase Realtime) |
|---|---|
| `subscribePlayers(tournamentId, cb)` | `supabase.channel().on('postgres_changes', ...)` |
| `subscribeTables(tournamentId, cb)` | 同上 |
| `subscribeMatches(tournamentId, cb)` | 同上 |

### 実装方針

```ts
// 例: players のリアルタイム購読
export function subscribePlayers(
  tournamentId: string,
  callback: (players: Player[]) => void
): () => void {
  const channel = supabase
    .channel(`players:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      async () => {
        // 変更通知を受けたら全件再取得
        const players = await getPlayers(tournamentId);
        callback(players);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

### hooks の修正

- `src/hooks/usePlayers.ts` のリアルタイム購読を Supabase Realtime に変更
- `src/hooks/useTables.ts` のリアルタイム購読を Supabase Realtime に変更
- `src/hooks/useMatches.ts` のリアルタイム購読を Supabase Realtime に変更

### Supabase 側の設定

Supabase ダッシュボードで対象テーブルの Realtime を有効化する必要がある。
- `players` / `tables` / `matches` / `match_results` テーブルで Publication を有効化

## 完了条件

- [ ] プレイヤー追加時に他ユーザーの画面が自動更新される
- [ ] 卓追加時に他ユーザーの画面が自動更新される
- [ ] 対局結果保存時にランキング・履歴が自動更新される
- [ ] `onSnapshot` への参照がコードから消えている
- [ ] チャンネルが適切に unsubscribe されている（メモリリークなし）

## 依存

- #003 #004 完了後に実施
