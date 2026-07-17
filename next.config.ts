import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 記録ページは URL fragment で記録トークンを受け取る。fragment 自体は
        // Referer に含まれないが、遷移元 URL も漏らさないよう二重に防いでおく
        source: "/record/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
