import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../../src/config/site.ts";

export const repository = new URL(SITE.repoUrl).pathname.slice(1);
/** Context of the commit status Cloudflare posts; preview-smoke.yml filters on the same string. */
export const statusContext = "cloudflare/preview-deployment";
const previewDomain = `preview.${SITE.host}`;
const uuidPattern = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const uuid = new RegExp(`^${uuidPattern}$`);
const descriptionPattern = new RegExp(`^deployment=(${uuidPattern}) build=(${uuidPattern})$`);

/** One deployed commit and the immutable address of its deployment. */
export interface PreviewTarget {
  sha: string;
  deploymentId: string;
  buildId: string;
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
  const { sha, deploymentId, buildId, baseUrl } = object(value);
  if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error("Invalid commit SHA");
  }
  if (typeof deploymentId !== "string" || !uuid.test(deploymentId)) {
    throw new Error("Invalid deployment ID");
  }
  if (typeof buildId !== "string" || !uuid.test(buildId)) {
    throw new Error("Invalid build UUID");
  }
  return { sha, deploymentId, buildId, baseUrl: fixedUrl(baseUrl, deploymentId) };
}

export function statusDescription({ deploymentId, buildId }: PreviewTarget): string {
  return `deployment=${deploymentId} build=${buildId}`;
}

export function targetFromStatus(status: { sha?: string; targetUrl?: string; description?: string }): PreviewTarget {
  const match = descriptionPattern.exec(status.description ?? "");
  if (!match) {
    throw new Error("Status description does not name a deployment and a build");
  }
  return parseTarget({ sha: status.sha, deploymentId: match[1], buildId: match[2], baseUrl: status.targetUrl });
}

/** Reads the JSONL file Wrangler writes to `WRANGLER_OUTPUT_FILE_PATH`. */
export function deploymentFromOutput(text: string): Pick<PreviewTarget, "deploymentId" | "baseUrl"> {
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

// Workflow step: validate the status event before any of it reaches a probe.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = targetFromStatus({
    sha: process.env.STATUS_SHA,
    targetUrl: process.env.STATUS_TARGET_URL,
    description: process.env.STATUS_DESCRIPTION,
  });
  appendFileSync(process.env.GITHUB_OUTPUT!, `base_url=${target.baseUrl}\n`);
}
