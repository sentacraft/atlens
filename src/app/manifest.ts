import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.pwaDescription,
    // Explicit app ID — prevents DevTools warning about falling back to start_url.
    id: "/",
    start_url: "/",
    scope: "/",
    display: SITE.display,
    // Prefer WCO on capable desktop browsers so the Nav background extends
    // into the title bar area. Falls back to standalone on unsupported platforms.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_override not yet in Next.js MetadataRoute.Manifest typings
    display_override: ["window-controls-overlay", "standalone"] as any,
    background_color: SITE.backgroundColor,
    // Manifest theme_color is a static fallback used in install dialogs and the
    // splash screen chrome. Use light so the install prompt looks natural on
    // light-mode systems. In-app adaptive theming is handled by the <meta
    // name="theme-color" media="..."> tags in the locale layout viewport export.
    theme_color: SITE.themeColor.light,
    // Shortcuts appear on long-press of the home screen icon (Android) and
    // right-click of the taskbar icon (desktop Chrome/Edge).
    // URLs use un-prefixed paths — the i18n middleware redirects to the
    // correct locale automatically.
    shortcuts: [
      {
        name: "Browse Lenses",
        short_name: "Browse",
        description: "Browse and filter all X-mount lenses",
        url: "/lenses",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Compare Lenses",
        short_name: "Compare",
        description: "Compare lenses side by side",
        url: "/lenses/compare",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/screenshot-mobile.png",
        sizes: "1206x2622",
        type: "image/png",
        // No form_factor → treated as mobile/narrow by Chrome.
        label: "X-Glass home screen",
      },
      {
        src: "/screenshots/screenshot-desktop.png",
        sizes: "2400x1854",
        type: "image/png",
        form_factor: "wide",
        label: "X-Glass lens browser",
      },
    ],
    icons: [
      // purpose: "any" — transparent background so Chrome's omnibox install
      // chip, Mac dock, and Windows taskbar render the mark without a white
      // square around it. iOS Safari home screen fills transparent pixels with
      // manifest background_color (#fff), producing the same white-bg result
      // without needing a separate apple-touch-icon.
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
        // 1024px for Retina macOS Dock — Chrome PWA picks the largest "any"
        // icon, and @2x displays need 1024px physical pixels for crisp rendering.
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
