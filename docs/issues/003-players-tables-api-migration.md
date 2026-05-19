# #003 Players / Tables API Routes 移行

## 概要

現状クライアントから直接 Firestore を叩いている Players・Tables の書き込み操作を API Routes に移行する。  
サーバーサイドバリデーションもここで実装する。

## やること

### 新規 API Routes の作成

```
/api/players/add/route.ts
/api/players/rename/route.ts
/api/tables/add/route.ts
/api/tables/rename/route.ts
```

### バリデーション（各 API Route で実施）

**players/add:**
- `name` が空でないこと
- `name` が 20 文字以内
- 同じ大会内で重複する名前がないこと

**players/rename:**
- `newName` が空でないこと
- `newName` が 20 文字以内
- 同じ大会内で重複する名前がないこと（自分自身を除く）
- Firestore のバッチ更新は不要（`player_id` で正規化されているため rename は players テーブルの更新だけで完結）

**tables/add・tables/rename:**
- players と同様

### hooks の修正

- `src/hooks/usePlayers.ts`: 書き込み時に API Routes を呼ぶように変更
- `src/hooks/useTables.ts`: 書き込み時に API Routes を呼ぶように変更
- `src/lib/firestore.ts` の `addPlayer` / `renamePlayer` / `addTable` / `renameTable` への直接呼び出しを削除

### コンポーネントの修正

- `PlayerRegistration.tsx` / `TableRegistration.tsx` の import を更新

## 完了条件

- [ ] プレイヤー追加・リネームが API Routes 経由で動作する
- [ ] 卓追加・リネームが API Routes 経由で動作する
- [ ] サーバーサイドで名前の重複・文字数チェックが行われる
- [ ] プレイヤーリネームが players テーブルの1行更新で完結する（バッチ不要）
- [ ] クライアントから Firestore への直接書き込みが消えている（players・tables）

## 依存

- #001 完了後に実施
