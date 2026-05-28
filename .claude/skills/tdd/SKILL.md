---
name: tdd
description: Guides t-wada Red-Green-Refactor TDD. Use when implementing features, fixing bugs, or refactoring logic with strict test-first development.
---

<!--
Example prompts:
  /tdd
  /tdd implement user authentication
  /tdd fix the cart total calculation bug
-->

You are following strict t-wada style Test-Driven Development. All code changes that involve logic (bug fixes, new features, refactors) **must** follow Red-Green-Refactor. No exceptions.

**Project test environment:** Vitest.
TDDサイクル中は `pnpm vitest src/lib/example.test.ts`（watch）、最終確認は `pnpm vitest run src/lib/example.test.ts`（one-shot）。

## The Cycle

1. **Red** — Write a failing test first. Run it and confirm it fails for the expected reason. Do **not** write any production code yet.
2. **Green** — Write the **minimum** production code to make the failing test pass. Nothing more.
3. **Refactor** — Clean up both test and production code while keeping all tests green. Remove duplication, improve naming, simplify structure.

Repeat until the feature or fix is complete.

## Rules

- **Never write production code without a failing test that demands it.** If there is no red test, there is no reason to write code.
- **One behavior per test.** Each test should verify exactly one thing. Name it after the behavior, not the implementation.
- **Keep the green step as small as possible.** Fake it, then make it real. Triangulate with additional tests when needed.
- **Run the affected test file after every green and every refactor step.** Never skip this.
- **Refactor only on green.** If a test is red, fix the production code first — do not restructure anything while tests are failing.
- **Tests are first-class code.** Apply the same quality standards (naming, readability) to test code as to production code.
- **Do not delete or weaken a test to make the build pass.** If a test is wrong, fix the test with a clear reason — do not silently remove it.
- **Bug fixes start with a regression test.** Before touching the bug, write a test that reproduces it and fails. Then fix the bug and confirm the test goes green.

## Workflow

1. **Sketch behaviors** — Before writing any code, list the behaviors to implement as `it.todo(...)` placeholders.
2. **Pick one behavior** — Start with the simplest or most fundamental one.
3. **Red** — Write the test. Run it. Confirm it fails for the right reason.
4. **Green** — Write the minimum code to pass. Run the test. Confirm it passes.
5. **Refactor** — Clean up. Run all affected tests. Confirm everything is green.
6. **Repeat** from step 2 until all behaviors are covered.

## Vitest Tips

```ts
// フォーカス実行（一つだけ走らせる）
it.only("...", () => { ... })
describe.only("...", () => { ... })

// スキップ
it.skip("...", () => { ... })

// 未実装のプレースホルダー
it.todo("...")
```

```bash
# 特定ファイルだけ実行
pnpm vitest run src/lib/scoring.test.ts

# パターンにマッチするテストだけ実行
pnpm vitest run --reporter=verbose -t "calculateBasePoint"
```

## Key Principles

- When in doubt, write a smaller test
- Each test should read like a specification of behavior
- The test name is documentation — make it descriptive (日本語でも可)
- If you cannot name a test clearly, the behavior is not well understood yet
- Prefer testing public interfaces over internal implementation details
- DO NOT DRY tests — duplication in tests is OK if it improves readability and clarity of intent
