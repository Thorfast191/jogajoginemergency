import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jogajog Emergency",
    short_name: "Jogajog",
    description:
      "QR stickers that let a finder reach you in an emergency, without ever showing them your phone number.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FBF9F6",
    theme_color: "#059669",
  };
}
