# Vitest TDD Reference

## Running

```bash
# TDDサイクル中は対象ファイルだけ watch で回す
pnpm vitest src/lib/scoring.test.ts

# ワンショット実行（CI / 最終確認用）
pnpm vitest run src/lib/scoring.test.ts

# 全テスト一括実行
pnpm test

# 名前パターンで絞り込む
pnpm vitest run --reporter=verbose -t "25000点"
```

## Import

`globals: true` が設定されているが、このプロジェクトの慣習として明示的に import する。

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
```

## Modifiers

組み込みモディファイアを使って、テストを削除・コメントアウトしない:

- `it.todo("description")` — 実装予定のプレースホルダー
- `it.skip("description", ...)` — 一時的に無効化（理由をコメントに書く）
- `it.fails("description", ...)` — Red フェーズ中の期待する失敗（スイートを green に保てる）
- `it.only("description", ...)` — サイクル中のフォーカス実行。コミット前に必ず外す
- `it.each([...])("description", ...)` — 同一の振る舞いを複数ケースで検証するときのみ使う

モディファイアはチェーン可能: `it.skip.only(...)`, `it.fails.only(...)`

See https://vitest.dev/api/test for the full API.

## Red-Green Example

```typescript
import { describe, it, expect } from "vitest";
import { calculateBasePoint } from "./scoring";

describe("calculateBasePoint", () => {
  it.todo("ちょうど25000点は 0pt");
  it.todo("25000点より上はプラス");
  it.todo("25000点より下はマイナス");
  it.todo("百点単位の端数が小数第一位になる");

  it("25000点は 0pt", () => {
    expect(calculateBasePoint(25000)).toBe(0);
  });
});
```

## Expected Failures

`try`/`catch` を使わず、`rejects`/`toThrow` で直接アサートする:

```typescript
it("不正なスコア合計は例外を投げる", async () => {
  await expect(submitMatch({ totalScore: 99000 })).rejects.toThrow(Error);
});
```

## Branching

テスト本体に `if` を書かない。振る舞いが異なるならテストを分ける:

```typescript
// Bad
it("スコアを変換する", () => {
  if (rank === 1) {
    expect(calculateUmaPoints(1)).toBe(15);
  } else {
    expect(calculateUmaPoints(4)).toBe(-15);
  }
});

// Good
it("1位は +15pt", () => {
  expect(calculateUmaPoints(1)).toBe(15);
});

it("4位は -15pt", () => {
  expect(calculateUmaPoints(4)).toBe(-15);
});
```

`it.each` は同一の振る舞いを複数ケースで検証するときのみ:

```typescript
it.each([
  [25000, 0],
  [42000, 17],
  [9000, -16],
])("%d点は %dpt", (score, expected) => {
  expect(calculateBasePoint(score)).toBe(expected);
});
```

## Assert Narrowing

非 null アサーション (`!`) を使わず、`assert` で前提条件を明示する:

```typescript
// Bad
it("最初の試合結果を返す", () => {
  const results = getMatchResults();
  expect(results[0]!.score).toBe(42000);
});

// Good
it("最初の試合結果を返す", () => {
  const results = getMatchResults();
  const first = results[0];
  assert.isDefined(first, "試合結果が1件以上あること");

  expect(first.score).toBe(42000);
});
```
