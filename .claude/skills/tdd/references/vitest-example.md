# Vitest Style Examples

レビュー・教育時の bad/good 拡張例。メインの TDD リファレンスは短く保つため、詳細例はここに集約する。

## Expected Failures

`try`/`catch` で例外を捕まえない。

Bad:

```typescript
it("不正な合計点は例外を投げる", async () => {
  try {
    await submitMatch({ totalScore: 99000 });
    expect.fail("例外が投げられるはず");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});
```

Good:

```typescript
it("不正な合計点は例外を投げる", async () => {
  await expect(submitMatch({ totalScore: 99000 })).rejects.toThrow(Error);
});
```

## Branching

テスト本体に `if` を書かない。

Bad:

```typescript
it("順位に応じたウマを返す", () => {
  const rank = getTestRank();

  if (rank === 1) {
    expect(calculateUmaPoints(rank)).toBe(15);
  } else {
    expect(calculateUmaPoints(rank)).toBe(-15);
  }
});
```

Good:

```typescript
it("1位は +15pt", () => {
  expect(calculateUmaPoints(1)).toBe(15);
});

it("4位は -15pt", () => {
  expect(calculateUmaPoints(4)).toBe(-15);
});
```

## Helpers

振る舞いとアサーションを隠すラッパー関数を作らない。

Bad:

```typescript
function expectBasePoint(score: number, expected: number) {
  expect(calculateBasePoint(score)).toBe(expected);
}

it("基本点の計算", () => {
  expectBasePoint(42000, 17);
});
```

Good:

```typescript
it("42000点は +17pt", () => {
  expect(calculateBasePoint(42000)).toBe(17);
});
```

## Hoisting

一回しか使わない値をテストの外に出さない。リテラルは振る舞いの近くに置く。

Bad:

```typescript
const SCORE = 42000;
const EXPECTED_POINT = 17;

it("基本点の計算", () => {
  expect(calculateBasePoint(SCORE)).toBe(EXPECTED_POINT);
});
```

Good:

```typescript
it("42000点は +17pt", () => {
  expect(calculateBasePoint(42000)).toBe(17);
});
```

## DRY しない

テストのセットアップが重複していても、各テストが独立して読めるなら共通化しない。

Bad:

```typescript
const players = buildPlayers();
const results = buildResults(players);

it("1位のポイントが正しい", () => {
  expect(results[0].point).toBe(30);
});

it("4位のポイントが正しい", () => {
  expect(results[3].point).toBe(-20);
});
```

Good:

```typescript
it("1位のポイントが正しい", () => {
  const results = calculateMatchResults([42000, 35000, 18000, 5000]);
  expect(results[0].point).toBe(30);
});

it("4位のポイントが正しい", () => {
  const results = calculateMatchResults([42000, 35000, 18000, 5000]);
  expect(results[3].point).toBe(-20);
});
```
