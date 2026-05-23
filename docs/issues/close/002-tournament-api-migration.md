# #002 Tournament API Routes 移行

## 概要

既存の `/api/create-tournament` と `/api/delete-tournament` を Firebase Admin SDK から Supabase Admin クライアントに差し替える。  
あわせてレート制限を追加する。

## やること

### `/api/create-tournament/route.ts` の修正

- Firebase Admin SDK → Supabase service_role クライアントに差し替え
- バリデーション（大会名の文字数制限 50 文字、customId の形式チェック）はそのまま維持
- レート制限を追加（同一 IP から 10 回/分 まで）

### `/api/delete-tournament/route.ts` の修正

- Firebase Admin SDK → Supabase service_role クライアントに差し替え
- Firestore の `recursiveDelete` の代わりに `on delete cascade` が効くため、`tournaments` の行を削除するだけでよい
- レート制限を追加

### レート制限の実装方針

Vercel Edge Middleware または `src/lib/rate-limit.ts` として簡易実装（in-memory or Vercel KV）。

```ts
// 簡易例（in-memory、サーバーレスでは効果が限定的なため Vercel KV 推奨）
const rateLimit = new Map<string, { count: number; resetAt: number }>();
```

## 完了条件

- [ ] 大会作成が Supabase 経由で動作する
- [ ] 大会削除が Supabase 経由で動作し、関連データ（players / tables / matches）も cascade で削除される
- [ ] Firebase Admin SDK がこのファイルから消えている
- [ ] レート制限が動作している

## 依存

- #001 完了後に実施
