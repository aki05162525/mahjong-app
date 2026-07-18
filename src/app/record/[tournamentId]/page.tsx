import { permanentRedirect } from "next/navigation";

// 記録リンク（/record/[id]#k=<token>）は廃止し、大会ページに記録機能を統合した。
// 配布済みの旧リンクを死なせないためのリダイレクトのみ残す。
export default async function LegacyRecordPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  permanentRedirect(`/${tournamentId}`);
}
