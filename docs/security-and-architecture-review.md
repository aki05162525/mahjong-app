# セキュリティ・アーキテクチャ調査レポート

作成日: 2026-05-19

---

## 概要

本レポートでは、mahjong-app の現状コードを調査し、セキュリティ上の脆弱性とアーキテクチャ上の改善点を整理する。  
重大度は **Critical / High / Medium / Low** の4段階で示す。

---

## 1. セキュリティ脆弱性

### 1-1. Firestoreへのクライアント直接書き込み【Critical】

**問題**  
プレイヤー追加・卓登録・対局結果保存・対局削除・プレイヤーリネーム・卓リネームは、
すべてブラウザから Firebase Client SDK を使って Firestore に直接書き込んでいる（`src/lib/firestore.ts`）。

現状のアプリが動作しているということは、Firestore Security Rules が実質 `allow read, write: if true;`
相当になっているはず。これは **世界中の誰でも** あらゆる大会のデータを読み書き・削除できることを意味する。

```
// 攻撃者は以下をブラウザコンソールで実行するだけでデータを改ざんできる
import { collection, addDoc } from "firebase/firestore";
await addDoc(collection(db, "tournaments", "target-id", "matches"), { ... });
```

**影響**  
- 不正な対局結果の追加・改ざん
- 全プレイヤー・全対局履歴の削除
- Firestore の読み書きクォータの枯渇（DoS 相当）

**対策**  
- Firestore Security Rules を `allow read: if true; allow write: if false;` に絞り、書き込みはすべて Next.js API Route 経由（Firebase Admin SDK）に移す
- または Firebase Authentication を導入し、大会オーナーのみが書き込めるルールを定義する

---

### 1-2. 単一の共有管理者パスワード【High】

**問題**  
大会の作成と削除は `ADMIN_PASSWORD` という環境変数1つで制御されている（`/api/create-tournament/route.ts`, `/api/delete-tournament/route.ts`）。

```ts
if (password !== process.env.ADMIN_PASSWORD) {
  return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
}
```

- パスワードが1種類しかなく、知っている人間は全大会を作成・削除できる
- レート制限がないためブルートフォース攻撃が可能
- 比較に `!==` を使っているため、タイミング攻撃は理論上成立する（実用上は低リスクだが）

**影響**  
- パスワードが漏洩・推測されると全大会が削除される
- ブルートフォースで突破される可能性

**対策**  
- API Routeにレート制限を導入する（`next-rate-limit` や Vercel の Edge Middleware など）
- 大会ごとに個別パスワードまたはオーナートークンを発行する
- タイミング攻撃対策として `crypto.timingSafeEqual` を使う

---

### 1-3. サーバーサイドバリデーションの欠如【High】

**問題**  
対局結果の保存（`saveMatch`）はクライアントから Firebase Client SDK で直接呼ばれるため、
サーバーサイドで入力を検証できない。

クライアント側のバリデーション（`MatchForm.tsx`）は以下をチェックしているが、
これらは **DevTools で簡単に迂回可能**：

- 4人のスコア合計が 100,000 点
- 同じプレイヤーの重複なし
- 回戦番号・卓名の入力

**影響**  
- スコア合計が 100,000 点でないデータが保存される
- 同じプレイヤーが複数登録されたデータが保存される
- ランキング計算が破綻する

**対策**  
- 対局結果保存を API Route に移し、サーバーサイドで同等のバリデーションを実施する

---

### 1-4. Firestoreバッチ上限（500操作）【Medium】

**問題**  
`renamePlayer` と `renameTable` は全対局を取得して一括更新するが、Firestore の `writeBatch` は1回あたり最大500操作しか許容しない。

```ts
// firestore.ts L143-L157
const batch = writeBatch(db);
batch.update(...); // players更新
for (const matchDoc of matchesSnap.docs) {
  batch.update(matchDoc.ref, { ... }); // matches更新
}
await batch.commit(); // 501件以上でクラッシュ
```

**影響**  
- 対局数が ~499件を超えると `renamePlayer` / `renameTable` が例外を投げて失敗する
- エラーはキャッチされて「変更に失敗しました」と表示されるだけで、データが中途半端に更新される可能性がある

**対策**  
- バッチを500操作ごとに分割してコミットする
- または後述のデータ正規化（1-5参照）で根本解決する

---

### 1-5. 入力値の長さ制限なし【Medium】

**問題**  
プレイヤー名・卓名・大会名のいずれにも最大文字数のバリデーションがない。

**影響**  
- 大量の文字列を入力してFirestoreの1ドキュメントサイズ上限（1MB）に近づける
- UIのレイアウト崩壊

**対策**  
- クライアント・サーバー双方で `maxLength` を設ける（例: 大会名50文字、プレイヤー名・卓名20文字）

---

## 2. アーキテクチャの問題

### 2-1. データ非正規化による整合性リスク【High】

**問題**  
`Match.results[]` の各要素に `playerName` と `tableName` を文字列として直接埋め込んでいる。

```ts
// firestore.ts: Match型
results: MatchResult[]; // → 各結果にplayerName: string

// Match型
tableName: string; // IDではなく名前を保存
```

これが原因で `renamePlayer` / `renameTable` では、全対局を読み込んで名前を書き換えるという高コストな操作が必要になっている。  
また、**リネーム処理がアトミックでない**（バッチが途中で失敗すると古い名前と新しい名前が混在する）。

**対策**  
- `Match` に `tableId` を保存し、表示時に `Table` から名前を引く（正規化）
- `MatchResult` に `playerName` を持たせず、ランキング構築時に `Player` から名前を引く
- ただし Firestore の結合クエリは存在しないため、リネーム時のバッチ更新は依然として必要。
  実用的な妥協案は「名前の変更履歴を別ドキュメントに持ち、表示時にマージする」方式。

---

### 2-2. 書き込み操作の一貫性のなさ【High】

**問題**  
- 大会作成・削除: Next.js API Route（Admin SDK）経由 ✅
- プレイヤー追加・リネーム、卓追加・リネーム、対局保存・削除: Client SDK 直接 ❌

APIを経由する操作と直接Firestoreを叩く操作が混在しており、認証・バリデーションの層を統一できていない。

**対策**  
- 全書き込み操作を API Route 経由に統一し、Firestore Security Rules の書き込みを `false` にする

---

### 2-3. 認証・認可の欠如（大会ごとの権限管理なし）【High】

**問題**  
大会IDを知っていれば誰でも対局結果・プレイヤーを追加・削除できる。  
現状は「URLを知っている人だけが参加できる」という Security by Obscurity に依存している。

**影響**  
- URLが SNS 等で広まると、第三者がデータを改ざんできる

**対策（段階的）**  
1. 短期: Firestore Security Rules で書き込みを制限し、対局削除・プレイヤー追加はパスワード確認を挟む
2. 中期: Firebase Authentication（匿名認証 or Google認証）を導入し、大会作成者を「オーナー」として記録する
3. 長期: オーナーのみが対局を削除・プレイヤーをリネームできるようにする

---

### 2-4. Firestore Security Rules がリポジトリに存在しない【Medium】

**問題**  
`firestore.rules` ファイルがリポジトリに含まれておらず、どのようなルールが設定されているか不明。

**対策**  
- `firestore.rules` と `firebase.json` をリポジトリに追加し、バージョン管理する
- CI/CD で `firebase deploy --only firestore:rules` を実行する

---

### 2-5. ページネーション・件数制限なし【Medium】

**問題**  
`getPlayers`・`subscribeMatches`・`subscribeTables` はすべてのドキュメントを一括取得する。

```ts
// 全対局を取得（件数制限なし）
getDocs(query(collection(db, "tournaments", tournamentId, "matches"), orderBy("createdAt")))
```

**影響**  
- 長期大会で対局数が数百件になるとリアルタイムリスナーのトラフィックが増大する
- 初回ロード時間が長くなる

**対策**  
- 対局履歴はページネーション（`limit` + `startAfter`）を使う
- ランキング計算はサーバーサイドで集計してキャッシュする（Cloud Functions または API Route + Cloud Firestore Aggregation Query）

---

### 2-6. 対局削除に確認フローがない（Webパターン）【Low】

**問題**  
`MatchHistory.tsx` では `window.confirm()` で削除確認しているが、ネイティブダイアログはデザインの統一が難しく、「対局削除」ボタンがパスワードなしで押せる。

**対策**  
- 大会削除と同様に、削除時にパスワード入力モーダルを表示する

---

### 2-7. エラーハンドリングの粒度が粗い【Low】

**問題**  
ほとんどの `try/catch` が全エラーを `"失敗しました"` という汎用メッセージで処理している。

```ts
} catch {
  setError("保存に失敗しました"); // どんなエラーでも同じメッセージ
}
```

**影響**  
- ネットワークエラー・バリデーションエラー・Firestore制限エラーの区別がつかない
- デバッグが難しい

**対策**  
- エラーの種別をログに記録する（`console.error`）
- Firestore の `FirebaseError` をキャッチして `code` プロパティに応じたメッセージを出す

---

## 3. 改善優先度サマリー

| # | 問題 | 重大度 | 工数目安 |
|---|------|--------|----------|
| 1 | Firestoreクライアント直書き＋SecurityRules | Critical | 大 |
| 2 | 単一共有パスワード・レート制限なし | High | 小〜中 |
| 3 | サーバーサイドバリデーション欠如 | High | 中 |
| 4 | 書き込み操作のAPIルート統一 | High | 大 |
| 5 | 認証・認可の欠如 | High | 大 |
| 6 | データ非正規化による整合性リスク | High | 大 |
| 7 | バッチ500件上限 | Medium | 小 |
| 8 | 入力値の長さ制限なし | Medium | 小 |
| 9 | firestore.rules のバージョン管理 | Medium | 小 |
| 10 | ページネーション欠如 | Medium | 中 |
| 11 | 対局削除のパスワードなし | Low | 小 |
| 12 | エラーハンドリングの粗さ | Low | 小 |

---

## 4. 推奨する改善ロードマップ

### Phase 1（最優先・小規模修正で効果大）
1. **Firestore Security Rules** を `allow write: if false;` に設定し、全書き込みを API Route 経由に統一
2. **API Route にレート制限**を追加（大会作成・削除エンドポイント）
3. **入力バリデーション**を API Route で実装（スコア合計・重複チェック・文字数制限）
4. **firestore.rules** をリポジトリに追加

### Phase 2（中期・設計変更あり）
5. **Firebase Authentication** の導入（匿名認証でも可）と大会オーナー概念の追加
6. **バッチ分割**による rename 処理の堅牢化
7. 対局履歴の**ページネーション**実装

### Phase 3（長期・大きな設計変更）
8. **データ正規化**（tableName → tableId、ランキング計算のサーバーサイド化）
9. **認可ルール**の整備（オーナーのみが削除・リネーム可能）
