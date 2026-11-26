import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../../src/config/site.ts";

export const repository = new URL(SITE.repoUrl).pathname.slice(1);
export const dispatchType = "cloudflare_preview_ready";
const previewDomain = `preview.${SITE.host}`;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** The dispatch payload: one deployed commit and the immutable address of its deployment. */
export interface PreviewTarget {
  sha: string;
  deploymentId: string;
  baseUrl: string;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a Preview record object");
  }
  return value as Record<string, unknown>;
}

function fixedUrl(value: unknown, deploymentId: string): string {
  if (typeof value !== "string") {
    throw new Error("Missing fixed deployment URL");
  }
  const url = new URL(value);
  const prefix = deploymentId.slice(0, 8);
  const label = url.hostname.slice(0, -(previewDomain.length + 1));
  if (url.protocol !== "https:" || url.origin !== value || url.port || !url.hostname.endsWith(`.${previewDomain}`) ||
      !(label === prefix || label.startsWith(`${prefix}-`))) {
    throw new Error("Expected this deployment's HTTPS Preview origin, not production or a branch alias");
  }
  return url.origin;
}

export function parseTarget(value: unknown): PreviewTarget {
  const { sha, deploymentId, baseUrl } = object(value);
  if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error("Invalid commit SHA");
  }
  if (typeof deploymentId !== "string" || !uuid.test(deploymentId)) {
    throw new Error("Invalid deployment ID");
  }
  return { sha, deploymentId, baseUrl: fixedUrl(baseUrl, deploymentId) };
}

/** Reads the JSONL file Wrangler writes to `WRANGLER_OUTPUT_FILE_PATH`. */
export function deploymentFromOutput(text: string): Omit<PreviewTarget, "sha"> {
  const records = text.trim().split("\n").filter(Boolean).map(line => object(JSON.parse(line)))
    .filter(row => row.type === "preview");
  if (records.length !== 1) {
    throw new Error("Expected exactly one Wrangler Preview output record");
  }
  const { version, deployment_id: deploymentId, deployment_urls: urls } = records[0];
  if (version !== 1 || typeof deploymentId !== "string" || !uuid.test(deploymentId) || !Array.isArray(urls)) {
    throw new Error("Wrangler did not return a supported deployment record");
  }
  const candidates = urls.flatMap(url => {
    try { return [fixedUrl(url, deploymentId)]; } catch { return []; }
  });
  if (candidates.length !== 1) {
    throw new Error("Wrangler did not return one fixed deployment URL on the project's Preview domain");
  }
  return { deploymentId, baseUrl: candidates[0] };
}

// Workflow step: validate the dispatch payload before any of it reaches a checkout ref or a probe.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf8"));
  const target = parseTarget(event.client_payload);
  appendFileSync(process.env.GITHUB_OUTPUT!, `sha=${target.sha}\nbase_url=${target.baseUrl}\n`);
}
