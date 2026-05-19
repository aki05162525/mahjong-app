# #006 Firebase 依存の完全削除

## 概要

移行完了後、Firebase / Firestore 関連の依存をコードと package.json から完全に除去する。

## やること

### ファイル削除

- `src/lib/firebase.ts` を削除
- `src/lib/firestore.ts` を削除

### package.json から削除

```json
// 削除するパッケージ
"firebase": "^12.13.0",
"firebase-admin": "^13.10.0"
```

### 環境変数の削除

**.env.local から削除:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_PASSWORD`

**Vercel の環境変数からも削除する**

### import の確認

```bash
grep -r "firebase" src/ --include="*.ts" --include="*.tsx"
```

上記で何も出ないことを確認する。

## 完了条件

- [ ] `firebase` / `firebase-admin` が package.json から消えている
- [ ] `src/lib/firebase.ts` / `src/lib/firestore.ts` が存在しない
- [ ] `grep -r "firebase" src/` の結果が空
- [ ] Vercel の不要な環境変数が削除されている
- [ ] ビルドが通る

## 依存

- #002 #003 #004 #005 すべて完了後に実施
