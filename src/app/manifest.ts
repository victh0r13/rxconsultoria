import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Caderninho — Fiado da Cantina",
    short_name: "Caderninho",
    description: "Controle de fiado da cantina da escola",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#f97316",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
