// No Next.js imports: scripts consume this file.

export interface SiteConfig {
  url: string;
  name: string;
  shortName: string;
  pwaDescription: string;
  themeColor: { light: string; dark: string };
  backgroundColor: string;
  display: "standalone" | "minimal-ui" | "fullscreen" | "browser";
}

export const SITE: SiteConfig = {
  url: "https://atlens.app",
  name: "Atlens",
  shortName: "Atlens",
  pwaDescription:
    "Your pocket lens database for Fujifilm cameras — specs normalized, zero noise.",
  themeColor: {
    light: "#ffffff",
    dark: "#0a0a0a",
  },
  backgroundColor: "#ffffff",
  display: "standalone",
};
