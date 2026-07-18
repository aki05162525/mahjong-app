import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://umaoka.app"),
  title: {
    default: "ウマオカ",
    template: "%s | ウマオカ",
  },
  description:
    "麻雀大会の対局結果をかんたんに記録・集計し、ランキングをリアルタイムで共有できるWebアプリ。",
  applicationName: "ウマオカ",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "ウマオカ",
    title: "ウマオカ",
    description: "みんなでつける、麻雀の成績表。",
  },
  twitter: {
    card: "summary",
    title: "ウマオカ",
    description: "みんなでつける、麻雀の成績表。",
  },
  appleWebApp: {
    capable: true,
    title: "ウマオカ",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f6f50",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${notoSansJP.className} min-h-full flex flex-col`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
