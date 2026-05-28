# #010 デバウンスで `fetchMatches` の連続呼び出しを抑制

## 概要

1試合を登録すると `matches` 1行と `match_results` 4行（4人分）がDBに挿入される。
現在は各 INSERT イベントで `fetchMatches()` が呼ばれるため、通常操作のたびに全件再取得が5回走っている。

```text
matchChannel   → matches INSERT          → fetchMatches() 1回
resultsChannel → match_results INSERT × 4 → fetchMatches() 4回
合計: 全件再取得が5回走る
```

アプリの通常操作で必ず発生するため、3つの Realtime 改善のうち最も優先度が高い。

## やること

`fetchMatches` は `useEffect` 内スコープで定義されているため、`useMemo` で外出しする案は動かない。
`useEffect` 内で `debounce` を作り、各チャンネルのハンドラに渡す。

```ts
useEffect(() => {
  const fetchMatches = () => { /* 既存の実装 */ };

  const debouncedFetch = debounce(fetchMatches, 100);

  fetchMatches(); // 初回取得はデバウンス不要

  const matchChannel = supabase
    .channel("matches:" + tournamentId)
    .on("postgres_changes", { ... }, debouncedFetch)
    .subscribe();

  const resultsChannel = supabase
    .channel("match_results:" + tournamentId)
    .on("postgres_changes", { ... }, debouncedFetch)
    .subscribe();

  const namesChannel = supabase
    .channel("match_names:" + tournamentId)
    .on("postgres_changes", { ... }, debouncedFetch)
    .on("postgres_changes", { ... }, debouncedFetch)
    .subscribe();

  return () => {
    debouncedFetch.cancel(); // アンマウント時に pending な呼び出しをキャンセル
    supabase.removeChannel(matchChannel);
    supabase.removeChannel(resultsChannel);
    supabase.removeChannel(namesChannel);
  };
}, [tournamentId]);
```

- `debounce` は `lodash-es` か自前実装を使う

## 完了条件

- [ ] 1試合登録したとき `fetchMatches` の呼び出しが1回に収まっている（ネットワークタブで確認）
- [ ] `pnpm build` と `pnpm test` が通る

## 依存

なし（独立して実施可能）
