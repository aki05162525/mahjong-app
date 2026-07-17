# Capability URL: 「URLを知っていること」を権限にする記録トークンの設計

作成日: 2026-07-17

関連: issue #68（設計議論）/ #69（実装）/ PR #84, #86, #88

---

## 概要

麻雀大会アプリの対局記録を「ログイン不要のまま、主催者がリンクを渡した人だけ」に限定した。採用したのは **capability URL** ——「URL を知っていること」自体を権限にするモデル。Google Docs の「リンクを知っている全員が編集可」と同じ発想で、URL を2種類に分けた。

- **閲覧 URL** `/{tournamentId}` … 読み取りのみ。誰に見せてもよい
- **記録 URL** `/record/{tournamentId}#k=<token>` … 読み取り + 書き込み。記録係にだけ渡す

記録 URL は閲覧の**上位互換**（読み取り ⊂ 読み取り+書き込み）。この包含関係を崩すと「記録ページから順位が見られない」といった UX の穴が生まれる（実際に一度やらかして PR #88 で直した）。

## なぜログインさせないのか

大会の現場では「その場にいる誰か」が記録係になる。全員にアカウント登録させるのは体験として重すぎるし、主催者が代理入力する運用は主催者がボトルネックになる。「QR を見せる → 読んだ人は誰でも記録できる」が理想の体験で、認証（あなたは誰か）ではなく **capability（この URL は何ができるか）** で認可する設計が合っていた。

---

## 設計上の決断

### 1. トークンは `tournaments` の列に置けない — Supabase の Data API と GRANT の罠

最初に思いつくのは `tournaments.write_token` 列。これは**このアプリでは即アウト**だった。閲覧を誰でもできるようにするため `tournaments` は anon ロールに全列 SELECT を許可しており、Supabase の Data API（PostgREST）経由で `?select=*` すれば丸読みされる。

そこで専用テーブルに分離した:

```sql
create table tournament_write_secrets (
  tournament_id text primary key references tournaments(id) on delete cascade,
  token_hash    text not null,
  created_at    timestamptz not null default now()
);

alter table tournament_write_secrets enable row level security;
create policy "tournament_write_secrets_service_only"
  on tournament_write_secrets for all
  using (auth.role() = 'service_role');

-- ここが罠: Supabase はデフォルト権限（ALTER DEFAULT PRIVILEGES）で
-- 新規テーブルを anon / authenticated に自動 GRANT する。
-- RLS だけに頼らず、明示的に REVOKE して Data API から到達不能にする。
revoke all on tournament_write_secrets from anon, authenticated;
```

RLS と GRANT は独立したレイヤーなので両方閉じる（多層防御）。「anon から SELECT 権限そのものが無い」ことは pgTAP でテストしている（`has_table_privilege('anon', ...)` が false であること）。

### 2. raw トークンはどこにも保存しない — 「一度だけ表示」の UX はここから逆算される

- 生成: `crypto.randomBytes(32).toString("base64url")`（URL に安全に埋め込める）
- 保存: sha256 ハッシュのみ。**raw は DB に存在しない**
- 照合: 提示されたトークンをハッシュして `crypto.timingSafeEqual` で比較

```ts
const stored = Buffer.from(data.token_hash, "hex");
const presented = Buffer.from(hashWriteToken(raw), "hex");
if (stored.length !== presented.length) return false; // timingSafeEqual は長さ不一致で throw する
return timingSafeEqual(stored, presented);
```

パスワードのソルト付きストレッチング（bcrypt 等）が不要なのは、トークンが 256bit の乱数で辞書攻撃が成立しないから。sha256 一発で足りる（pgcrypto も不要になり、ハッシュ化をアプリ層に置けた）。

この決断の帰結として「**raw は発行レスポンスで一度だけ返り、二度と表示できない**」という UX が確定する。紛失したら再発行（＝`token_hash` の作り直し＝旧リンク全失効）。GitHub の Personal Access Token と同じ体験、と説明すると通じやすい。

### 3. トークンは URL の fragment（`#k=`）で渡す

`?k=<token>`（query）ではなく `#k=<token>`（fragment）にした理由: **fragment はブラウザが HTTP リクエストに含めない**。つまり

- サーバーのアクセスログに残らない（Vercel のログにトークンが並ぶ事故を構造的に防げる）
- Referer ヘッダにも含まれない

クライアント側では受け取り後すぐに痕跡を消す:

```ts
const fromHash = parseTokenFromHash(window.location.hash);
if (fromHash) {
  saveWriteToken(tournamentId, fromHash);        // localStorage に退避
  history.replaceState(null, "", location.pathname); // アドレスバー・履歴から即除去
}
```

localStorage 退避のおかげで、リンクを一度開けばリロード・再訪問でも記録を続けられる（capability URL の弱点である「毎回リンクが必要」を緩和）。さらに `/record/*` には `Referrer-Policy: no-referrer` を付けて、ページ URL 自体も外部に漏らさない二重防御にした。

### 4. 認可とレート制限の順序を固定する — 「検証通過後にだけ課金する」

`POST /api/matches` は3層構造で、**順序に意味がある**:

```
1. IP プレフィルタ（緩め・60/分）
2. トークンのハッシュ照合 || ログイン済みオーナー
3. 大会単位トークンバケット消費（容量30・補充10/分）
```

- 1 が先頭なのは、生フラッドから後段の DB ルックアップ（トークン照合）を守るため
- 3 が **2 の通過後**なのが肝。逆にすると、攻撃者が無効トークンを連投するだけで大会の正規枠を枯渇させられる（正規の記録係が 429 で書けなくなる）。「大会の帯域」は検証を通った者だけが消費する

無効トークンは `401 { code: "INVALID_WRITE_TOKEN" }` と専用コードにして、汎用エラーと区別した。クライアントはこれを見て「このリンクは無効です。主催者に新しい記録用URLをもらってください」という**次の行動につながるメッセージ**を出せる（「エラーが発生しました」では記録係は詰む）。

### 5. レート制限はフェイルオープン

Upstash（Redis）障害時は制限なしで通す。障害中も「トークン検証そのものは生きている」ので、守りが完全にゼロになるわけではない——このリスク受容をコードコメントに明記した。詳細は `rate-limiting-upstash.md`。

---

## capability URL モデルの限界（受け入れたもの）

- **転送を止められない**: リンクを受け取った人がさらに転送できる。用途（身内の大会のスコア記録）に対して許容。悪用されたら再発行で一斉失効できる
- **有効期限なし**: 大会は数時間〜1日で終わるので期限管理の複雑さに見合わない。必要になったら `created_at` ベースで足せる
- **トークンは大会につき1本**: 記録係ごとの識別・失効はできない。複数トークン化は必要になってから

## ブログ化するときの構成メモ

1. つかみ: 「ログインなしで、でも誰でもではなく」——大会現場の UX 要件から
2. capability URL という考え方（Google Docs 共有リンク、W3C の "Good Practices for Capability URLs" に言及）
3. Supabase 固有の罠（anon 全列 SELECT・新規テーブル自動 GRANT）→ 別テーブル + REVOKE
4. トークンのライフサイクル（ハッシュのみ保存・一度だけ表示・再発行＝ローテーション）
5. fragment 渡しとログ・Referer の話
6. レート制限の消費順序（認可を通った者だけが帯域を使う）
7. 限界と割り切り
