# Lintの運用

`pnpm lint` は Oxlint を実行する。CI とコミット前フックも同じ `.oxlintrc.json` を使う。型チェックは別途 `pnpm exec tsc --noEmit`、整形は Prettier が担当する。

## ルールの移行方針

従来の Next.js Core Web Vitals・TypeScript・Zod 推奨設定を基に、既存の重要度とオプションを明示した。Oxlint の標準 correctness カテゴリーは無効にし、移行対象のルールを個別に有効化している。React Compiler 関連のネイティブルールも明示的に有効化する。

ネイティブで対応する Next.js・React・Hooks・TypeScript・アクセシビリティのルールを使い、次は JavaScript プラグイン経由で実行する。

- `eslint-plugin-zod` の推奨23ルール
- `eslint-plugin-react` の `no-deprecated`、`require-render-return`
- `eslint-plugin-react-hooks` の `config`、`gating`
- `@next/eslint-plugin-next` の `no-location-assign-relative-destination`

プラグイン名の衝突を避けるため、後半3プラグインには設定内で互換用の別名を付けている。ESLint 本体と `eslint-config-next` は直接依存から削除したが、プラグインの peer dependency により ESLint が依存ツリーに残る場合がある。lintコマンドでは ESLint を起動しない。

`react/jsx-uses-react` と `react/jsx-uses-vars` は移行対象から除外した。前者は自動 JSX 変換では不要で、後者が担っていた JSX 内の変数参照は Oxlint が認識する。ルールの実装は ESLint と完全同一ではないため、更新時は検出内容も確認する。

JavaScript プラグイン対応と一部の React Compiler ルールは成熟度に注意が必要なため、依存更新時には実行の成功だけでなく、違反コードが検出されることも確認する。今回の移行では一時ファイルで TypeScript、Zod、Hooks、Compiler、Next.js、アクセシビリティの違反検出を確認した。

## 対象ファイルと抑制コメント

`.next`、`out`、`build`、`next-env.d.ts` は明示的に除外する。Oxlint は `.gitignore` も参照するため、Gitの無視対象にlintしたいソースを追加しないよう注意する。

行単位の抑制には `oxlint-disable-next-line` と移行後のルール名を使う。既存の型変換とテスト用フックの抑制コメントも、この形式に移行している。

## 性能の確認

同じ環境・同じ対象に対して `pnpm lint` を複数回実行し、プロセス起動時間を含めて計測する。JavaScript プラグインは互換性を維持するために残しているため、ネイティブルールのみの実行より負荷がかかる。

lintの短縮時間はCI全体の短縮時間とは異なる。CIには依存インストール、Supabase起動、DBテスト、型チェック、整形チェック、アプリテストもあるため、全体の効果は GitHub Actions の実行結果で別途確認する。

参考: [ESLintからの移行](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint)、[JavaScriptプラグイン](https://oxc.rs/docs/guide/usage/linter/js-plugins)。
