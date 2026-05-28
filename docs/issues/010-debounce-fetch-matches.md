# #010 デバウンスで `fetchMatches` の連続呼び出しを抑制

## 概要

1試合を登録すると `matches` 1行と `match_results` 4行（4人分）がDBに挿入される。
現在は各 INSERT イベントで `fetchMatches()` が呼ばれるため、通常操作のたびに全件再取得が5回走っている。

```
matchChannel   → matches INSERT          → fetchMatches() 1回
resultsChannel → match_results INSERT × 4 → fetchMatches() 4回
合計: 全件再取得が5回走る
```

アプリの通常操作で必ず発生するため、3つの Realtime 改善のうち最も優先度が高い。

## やること

`useMatches.ts` の Realtime ハンドラにデバウンスを追加し、短時間に連続するイベントを1回の `fetchMatches()` にまとめる。

```ts
const debouncedFetch = useMemo(
  () => debounce(fetchMatches, 100),
  [tournamentId]
);
```

- `debounce` は `lodash-es` か自前実装を使う
- 各チャンネルのハンドラを `fetchMatches` → `debouncedFetch` に差し替える
- コンポーネントアンマウント時に `debouncedFetch.cancel()` を呼んでフラッシュを防ぐ

## 完了条件

- [ ] 1試合登録したとき `fetchMatches` の呼び出しが1回に収まっている（ネットワークタブで確認）
- [ ] `pnpm build` と `pnpm test` が通る

## 依存

なし（独立して実施可能）
