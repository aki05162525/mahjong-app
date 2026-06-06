// 新規大会作成時に自動投入する標準ルール。
// 既存大会への seed はマイグレーション(20260606000000_add_rules.sql)で別途実施済み。
export const SEED_RULES = [
  { name: "10-20（ワンツー）", uma: [20, 10, -10, -20], returnPoints: 30000, isDefault: true },
  { name: "Mリーグルール", uma: [30, 10, -10, -30], returnPoints: 30000, isDefault: false },
] as const;
