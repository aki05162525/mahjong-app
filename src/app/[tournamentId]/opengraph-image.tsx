import { ImageResponse } from "next/og";
import { getSupabasePublic } from "@/infra/supabase-public";
import { fetchMatches } from "@/lib/matchesQuery";
import { buildRanking } from "@/lib/ranking";
import { fmtPt } from "@/lib/utils";

export const alt = "大会のランキング";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// LINE 等のクローラーが取得するプレビュー用画像なので、対局のたびに再生成する必要はない。
// 5分間はキャッシュを使い回し、フォント取得とランキング集計の負荷を抑える。
export const revalidate = 300;

const BRAND_TEXT = "ウマオカ";
const TAGLINE = "みんなでつける、麻雀の成績表。";
const EMPTY_MESSAGE = "対局結果はまだありません";
const RANK_COLORS = ["#caa53d", "#9aa0a6", "#b1743a"];

// Google Fonts の css2 API は User-Agent が古いブラウザ扱いだと ttf/otf を返す。
// next/og(satori) は woff2 未対応のため、素の fetch(モダンUAを送らない)でこの挙動を利用する。
// text パラメータで実際に描画する文字だけを渡し、日本語フォントのフル取得を避ける。
async function loadGoogleFont(text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (!match) {
    throw new Error("Google Fontの取得に失敗しました");
  }
  const fontResponse = await fetch(match[1]);
  return fontResponse.arrayBuffer();
}

export default async function Image({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const supabase = getSupabasePublic();

  const [{ data: tournament }, matches] = await Promise.all([
    supabase.from("tournaments").select("name").eq("id", tournamentId).single(),
    fetchMatches(supabase, tournamentId),
  ]);

  const tournamentName = tournament?.name ?? BRAND_TEXT;
  const top3 = buildRanking(matches).slice(0, 3);

  const renderedText = [
    BRAND_TEXT,
    TAGLINE,
    tournamentName,
    EMPTY_MESSAGE,
    ...top3.flatMap((entry) => [String(entry.rank), entry.playerName, fmtPt(entry.totalPoint)]),
  ].join("");
  const fontData = await loadGoogleFont(Array.from(new Set(renderedText)).join(""));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fbfbf9",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "48px 56px",
          background: "#1f6f50",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#cfe3d7" }}>{BRAND_TEXT}</div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#ffffff" }}>
          {tournamentName}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "32px 56px",
          gap: 20,
        }}
      >
        {top3.length === 0 ? (
          <div style={{ display: "flex", fontSize: 36, color: "#6e6d65" }}>{EMPTY_MESSAGE}</div>
        ) : (
          top3.map((entry, idx) => (
            <div
              key={entry.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "16px 24px",
                borderRadius: 16,
                background: "#ffffff",
                border: "1px solid #dedcd3",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: RANK_COLORS[idx],
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {entry.rank}
              </div>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  fontSize: 36,
                  color: "#1a1a18",
                  fontWeight: 700,
                }}
              >
                {entry.playerName}
              </div>
              <div style={{ display: "flex", fontSize: 36, color: "#1f6f50", fontWeight: 700 }}>
                {fmtPt(entry.totalPoint)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", padding: "0 56px 32px", fontSize: 22, color: "#6e6d65" }}>
        {TAGLINE}
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Noto Sans JP", data: fontData, style: "normal", weight: 700 }],
    }
  );
}
