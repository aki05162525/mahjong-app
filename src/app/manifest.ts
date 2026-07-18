import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ウマオカ",
    short_name: "ウマオカ",
    description: "みんなでつける、麻雀の成績表。",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbf9",
    theme_color: "#1f6f50",
    lang: "ja",
  };
}
