// No Next.js imports: scripts consume this file.

export interface SiteConfig {
  /** The production domain, without scheme. */
  host: string;
  url: string;
  /** The public contact address. */
  contactEmail: string;
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

const HOST = "atlens.app";
const REPO_URL = "https://github.com/sentacraft/atlens";

export const SITE: SiteConfig = {
  host: HOST,
  url: `https://${HOST}`,
  contactEmail: `me@${HOST}`,
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
