import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小次郎麻雀大会スコア",
  description: "小次郎麻雀大会の点数記録・ランキング管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-gray-900">{children}</body>
    </html>
  );
}
