import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CINE PACK",
    short_name: "CINE PACK",
    description: "Software de producción audiovisual por departamentos.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0D12",
    theme_color: "#0D0D12",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
