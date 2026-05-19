/**
 * Firestore → Supabase 移行スクリプト
 *
 * 実行前の準備:
 *   1. Firebase Console > プロジェクトの設定 > サービスアカウント > 新しい秘密鍵を生成
 *      → serviceAccountKey.json をこのリポジトリルートに保存（gitignore 済み）
 *   2. npm install firebase-admin --no-save
 *   3. node --env-file=.env.local scripts/migrate-firestore.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Firebase Admin 初期化 ────────────────────────────────────────────────
const keyPath = resolve(process.cwd(), "serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(keyPath, "utf-8"));

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

// ── Supabase クライアント ────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── ヘルパー ────────────────────────────────────────────────────────────
function toIso(ts) {
  return ts?.toDate?.()?.toISOString() ?? new Date().toISOString();
}

async function insert(table, rows) {
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(`[${table}] ${error.message}`);
}

// ── メイン ──────────────────────────────────────────────────────────────
async function migrate() {
  const tournamentsSnap = await firestore.collection("tournaments").get();
  console.log(`大会数: ${tournamentsSnap.size}`);

  for (const tDoc of tournamentsSnap.docs) {
    const tid = tDoc.id;
    const tData = tDoc.data();
    console.log(`\n▶ 大会: ${tData.name} (${tid})`);

    // tournaments はテキスト型 ID なので Firestore の ID をそのまま使う
    await insert("tournaments", {
      id: tid,
      name: tData.name,
      created_at: toIso(tData.createdAt),
    });

    // ── players ─────────────────────────────────────────────────────────
    const playerIdMap = new Map(); // firestoreId → supabase uuid
    const playersSnap = await firestore
      .collection("tournaments")
      .doc(tid)
      .collection("players")
      .orderBy("createdAt")
      .get();

    for (const pDoc of playersSnap.docs) {
      const newId = randomUUID();
      playerIdMap.set(pDoc.id, newId);
      await insert("players", {
        id: newId,
        tournament_id: tid,
        name: pDoc.data().name,
        created_at: toIso(pDoc.data().createdAt),
      });
      console.log(`  プレイヤー: ${pDoc.data().name}`);
    }

    // ── tables ──────────────────────────────────────────────────────────
    const tableNameToId = new Map(); // tableName → supabase uuid
    const tablesSnap = await firestore
      .collection("tournaments")
      .doc(tid)
      .collection("tables")
      .orderBy("createdAt")
      .get();

    for (const tbDoc of tablesSnap.docs) {
      const newId = randomUUID();
      tableNameToId.set(tbDoc.data().name, newId);
      await insert("tables", {
        id: newId,
        tournament_id: tid,
        name: tbDoc.data().name,
        created_at: toIso(tbDoc.data().createdAt),
      });
      console.log(`  卓: ${tbDoc.data().name}`);
    }

    // ── matches & match_results ──────────────────────────────────────────
    const matchesSnap = await firestore
      .collection("tournaments")
      .doc(tid)
      .collection("matches")
      .orderBy("createdAt")
      .get();

    for (const mDoc of matchesSnap.docs) {
      const mData = mDoc.data();

      // Firestore は tableName（文字列）を保存、Supabase は table_id（UUID）が必要
      const tableId = tableNameToId.get(mData.tableName);
      if (!tableId) {
        console.warn(`  ⚠ tableName "${mData.tableName}" が tables に存在しない。スキップ。`);
        continue;
      }

      const newMatchId = randomUUID();
      await insert("matches", {
        id: newMatchId,
        tournament_id: tid,
        table_id: tableId,
        round_number: mData.roundNumber,
        created_at: toIso(mData.createdAt),
      });

      const results = mData.results ?? [];
      const matchResultRows = [];
      for (const r of results) {
        const playerId = playerIdMap.get(r.playerId);
        if (!playerId) {
          console.warn(`  ⚠ playerId "${r.playerId}" が players に存在しない。スキップ。`);
          continue;
        }
        matchResultRows.push({
          match_id: newMatchId,
          player_id: playerId,
          score: r.score,
          rank: r.rank,
          base_point: r.basePoint,
          uma_point: r.umaPoint,
          total_point: r.totalPoint,
        });
      }
      if (matchResultRows.length > 0) await insert("match_results", matchResultRows);

      console.log(
        `  対局: 第${mData.roundNumber}回戦 卓「${mData.tableName}」(${results.length}件)`
      );
    }
  }

  console.log("\n✅ 移行完了");
}

migrate().catch((err) => {
  console.error("\n❌ エラーで停止:", err.message);
  process.exit(1);
});
