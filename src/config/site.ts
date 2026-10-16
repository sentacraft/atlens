// No Next.js imports: scripts consume this file.

export interface SiteConfig {
  url: string;
  /** The public source repository. */
  repoUrl: string;
  /** The README section that documents the data pipeline. */
  pipelineDocUrl: string;
  name: string;
  shortName: string;
  pwaDescription: string;
  themeColor: { light: string; dark: string };
  backgroundColor: string;
  display: "standalone" | "minimal-ui" | "fullscreen" | "browser";
}

const REPO_URL = "https://github.com/sentacraft/atlens";

export const SITE: SiteConfig = {
  url: "https://atlens.app",
  repoUrl: REPO_URL,
  pipelineDocUrl: `${REPO_URL}#data-pipeline`,
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
