import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

export async function POST(req: NextRequest) {
  const { name, customId, password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "大会名を入力してください" }, { status: 400 });
  }

  const db = getAdminDb();

  if (customId) {
    if (!/^[a-zA-Z0-9_-]+$/.test(customId)) {
      return NextResponse.json({ error: "IDは英数字・ハイフン・アンダースコアのみ使えます" }, { status: 400 });
    }
    const ref = db.collection("tournaments").doc(customId);
    const existing = await ref.get();
    if (existing.exists) {
      return NextResponse.json({ error: `「${customId}」はすでに使われています` }, { status: 409 });
    }
    await ref.set({ name: name.trim(), createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ id: customId });
  }

  const ref = await db.collection("tournaments").add({
    name: name.trim(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ id: ref.id });
}
