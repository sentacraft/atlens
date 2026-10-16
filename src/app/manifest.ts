import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { buildComparePath } from "@/lib/url/compare";
import { browsePath } from "@/lib/url/routes";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.pwaDescription,
    id: "/",
    start_url: "/?ref=pwa",
    scope: "/",
    display: SITE.display,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_override not yet in Next.js MetadataRoute.Manifest typings
    display_override: ["window-controls-overlay", "standalone"] as any,
    background_color: SITE.backgroundColor,
    theme_color: SITE.themeColor.light,
    // Un-prefixed paths: the i18n middleware adds the locale.
    shortcuts: [
      {
        name: "Browse Lenses",
        short_name: "Browse",
        description: "Browse and filter all X Mount and G Mount lenses",
        url: `${browsePath("X")}?ref=pwa-browse`,
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Compare Lenses",
        short_name: "Compare",
        description: "Compare lenses side by side",
        url: `${buildComparePath("X", [])}?ref=pwa-compare`,
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/screenshot-mobile.png",
        sizes: "1206x2622",
        type: "image/png",
        label: "Atlens home screen",
      },
      {
        src: "/screenshots/screenshot-desktop.png",
        sizes: "2466x1544",
        type: "image/png",
        form_factor: "wide",
        label: "Atlens lens browser",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // 1024px: Chrome picks the largest "any" icon for the Retina macOS Dock.
        src: "/icons/icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
