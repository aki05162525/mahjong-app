# 技術面接: リアルタイム同期の設計

## STAR構成のストーリー

**Situation**
複数人が同時に使う麻雀大会スコア管理アプリ。参加者全員が同じ画面を見ながらリアルタイムでスコアを確認する。

**Task**
1局終わるたびにスコアを登録し、全員の画面に即座に反映する必要がある。

**Action**
ポーリングではなく Supabase Realtime のプッシュ型同期を選択した。
このアプリは「更新頻度は低い（1局ごと）が、更新されたら即座に全員に反映が必要」という特性を持つ。
ポーリングは変更がなくてもリクエストが発生し続けるため（`ユーザー数 × 問い合わせ頻度`）、この特性に合わない。
Realtime はDB変更があったときだけプッシュされるため、即時性と無駄なリクエストの排除を両立できる。

**Result**
1局登録されると WebSocket 経由で全員の画面が即座に更新される。

---

## 現在の実装の詳細（`useMatches.ts`）

3つの Supabase Realtime チャンネルをサブスクライブしている：

| チャンネル | 対象テーブル | イベント | フィルター |
|---|---|---|---|
| `matchChannel` | `matches` | `*` | `tournament_id=eq.${tournamentId}` |
| `resultsChannel` | `match_results` | `INSERT` | なし |
| `namesChannel` | `players`, `tables` | `UPDATE` | `tournament_id=eq.${tournamentId}` |

いずれのイベントでも `fetchMatches()` を呼び出し、全件を再取得して State を更新する。

---

## 既知のトレードオフと深掘り回答

### 1. `resultsChannel` にフィルターがない理由

`match_results` テーブルには `tournament_id` カラムがない。
テーブル構造は `tournaments → matches（tournament_id あり）→ match_results（match_id あり）` で、
`match_results` から大会を特定するには `matches` を経由する必要がある。
Supabase Realtime のフィルターはそのテーブルのカラムにしか使えないため、現状は他の大会の INSERT でも再フェッチが走る。

**改善案**
- `match_results` に `tournament_id` を追加してフィルターを有効化（正規化は崩れるがトレードオフとして合理的）
- イベントの `payload` に含まれる `match_id` で自前フィルタリング

### 2. 全件再取得 vs 差分更新

現在は Realtime イベントを受け取るたびに全件を再取得している。

| | 全件再取得（現在） | 差分更新（payload活用） |
|---|---|---|
| 実装のシンプルさ | ◎ | △ |
| データ量が増えたときの速度 | △ | ◎ |
| 正確性 | ◎ | △（JOIN結果が payload に含まれないため補完が必要） |

差分更新が難しい理由：`postgres_changes` の `payload.new` にはそのテーブルの1行のみが入る。
`useMatches` は `tables`・`players` を JOIN して取得しているため、payload だけでは `toMatch()` の変換ができない。

**全件再取得のままで良い条件**
- 1大会あたりの試合数が数十局以内
- 同時接続が数人程度

コストは `試合数 × 同時接続人数` で増えるため、スケールが見込まれる場合は差分更新を検討する。

---

## コードを読んで発見したパフォーマンス改善ポイント

### 問題1（最重要）: 1試合登録で `fetchMatches` が5回呼ばれる

試合を1局登録すると、DBには `matches` 1行 + `match_results` 4行（4人分）が挿入される。

```
matchChannel   → matches INSERT        → fetchMatches() 1回
resultsChannel → match_results INSERT × 4人 → fetchMatches() 4回
合計: 全件再取得が5回走る
```

アプリの通常操作のたびに起きているため、3つの中で最も改善効果が高い。

**改善案**: デバウンスを挟み、短時間に連続するイベントをまとめて1回の `fetchMatches()` に集約する。

```ts
const debouncedFetch = useMemo(
  () => debounce(fetchMatches, 100),
  [tournamentId]
);
```

### 問題2: `resultsChannel` にフィルターなし（再掲）

他の大会への試合登録でも、全ての開いているページで `fetchMatches()` が走る。
問題1のデバウンスを入れると、1登録あたり5回 → 1回になるため、問題2の影響もあわせて小さくなる。

### 問題3: player rename で `useMatches` と `usePlayers` が重複フェッチ

`namesChannel`（`useMatches` 内）と `usePlayers` のチャンネルが同じ `players` テーブルの UPDATE を購読している。
player名変更時に両方が発火し、matches の全件取得と players の取得が同時に走る。

影響は player rename 時のみで頻度は低いため、優先度は低い。

---

## 面接で深掘りされたときの一言まとめ

- **なぜ Realtime か**: 更新頻度は低いが即時性が必要な特性に、プッシュ型が合っている
- **なぜ全件再取得か**: JOIN結果を payload から復元するコストより、シンプルさを優先した。現在のスケールでは問題ない
- **改善するなら（優先順）**:
  1. デバウンスで `fetchMatches` の連続呼び出しを抑制（1試合登録 → 5回 → 1回）
  2. `match_results` に `tournament_id` を追加してフィルターを有効化
  3. 差分更新に移行してスケーラビリティを上げる
