import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { SITE } from "../../src/config/site.ts";
import { oneEachTemplate } from "../lib/route-templates.mjs";

export const repository = new URL(SITE.repoUrl).pathname.slice(1);
export const previewDomain = `preview.${SITE.host}`;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hash = /^[a-f0-9]{64}$/;

export interface Verification {
  version: 1;
  repository: string;
  sha: string;
  branch: string;
  buildId: string;
  deploymentId: string;
  baseUrl: string;
  paths: string[];
  inputs: { lockfile: string; catalog: string };
}
export type BuildRecord = Omit<Verification, "deploymentId" | "baseUrl">;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a verification object");
  }
  return value as Record<string, unknown>;
}

export function validPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || /[\\#\u0000- ]/.test(value)) {
    return false;
  }
  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\u0000- ]/.test(decoded) || decoded.split(/[/?]/).some(p => p === "." || p === "..")) {
      return false;
    }
    return value === "/" || /^\/(en|zh)(\/|$)/.test(value);
  } catch {
    return false;
  }
}

function fixedUrl(value: unknown, deploymentId: string): string {
  if (typeof value !== "string") {
    throw new Error("Missing fixed deployment URL");
  }
  const url = new URL(value);
  const prefix = deploymentId.slice(0, 8);
  const label = url.hostname.slice(0, -(previewDomain.length + 1));
  if (url.protocol !== "https:" || url.origin !== value || url.username || url.password ||
      url.port || !url.hostname.endsWith(`.${previewDomain}`) ||
      !(label === prefix || label.startsWith(`${prefix}-`))) {
    throw new Error("Expected this deployment's HTTPS Preview origin, not production or a branch alias");
  }
  return url.origin;
}

export function parseBuildRecord(value: unknown): BuildRecord {
  const data = object(value);
  const keys = ["version", "repository", "sha", "branch", "buildId", "paths", "inputs"];
  if (Object.keys(data).some(k => !keys.includes(k)) || data.version !== 1 || data.repository !== repository ||
      typeof data.sha !== "string" || !/^[a-f0-9]{40}$/.test(data.sha) ||
      typeof data.branch !== "string" || data.branch === "main" ||
      !/^[a-zA-Z0-9_./-]{1,240}$/.test(data.branch) ||
      typeof data.buildId !== "string" || !uuid.test(data.buildId)) {
    throw new Error("Invalid Preview verification identity");
  }
  if (!Array.isArray(data.paths) || data.paths.length === 0 || data.paths.length > 200 || !data.paths.every(validPath)) {
    throw new Error("Invalid or oversized verification route list");
  }
  const inputs = object(data.inputs);
  if (Object.keys(inputs).sort().join(",") !== "catalog,lockfile" ||
      typeof inputs.catalog !== "string" || !hash.test(inputs.catalog) ||
      typeof inputs.lockfile !== "string" || !hash.test(inputs.lockfile)) {
    throw new Error("Invalid build input hashes");
  }
  if (Buffer.byteLength(JSON.stringify(data)) > 59_000) {
    throw new Error("Build metadata exceeds the dispatch budget");
  }
  return {
    version: 1, repository, sha: data.sha, branch: data.branch, buildId: data.buildId,
    paths: data.paths, inputs: { lockfile: inputs.lockfile, catalog: inputs.catalog },
  };
}

export function parseVerification(value: unknown): Verification {
  const data = object(value);
  const { deploymentId, baseUrl, ...build } = data;
  const record = parseBuildRecord(build);
  if (typeof deploymentId !== "string" || !uuid.test(deploymentId)) {
    throw new Error("Invalid deployment ID");
  }
  if (Buffer.byteLength(JSON.stringify(data)) > 60_000) {
    throw new Error("Verification exceeds the dispatch payload budget");
  }
  return { ...record, deploymentId, baseUrl: fixedUrl(baseUrl, deploymentId) };
}

export function readVerification(file: string): Verification {
  return parseVerification(JSON.parse(readFileSync(file, "utf8")));
}

export function deploymentFromOutput(text: string): Pick<Verification, "deploymentId" | "baseUrl"> {
  const records = text.trim().split("\n").filter(Boolean).map(line => object(JSON.parse(line)))
    .filter(row => row.type === "preview");
  if (records.length !== 1) {
    throw new Error("Expected exactly one Wrangler Preview output record");
  }
  const row = records[0];
  if (row.version !== 1 || typeof row.deployment_id !== "string" || !uuid.test(row.deployment_id) ||
      !Array.isArray(row.deployment_urls)) {
    throw new Error("Wrangler did not return a supported deployment record");
  }
  const candidates = row.deployment_urls.flatMap(url => {
    try { return [fixedUrl(url, row.deployment_id as string)]; } catch { return []; }
  });
  if (candidates.length !== 1) {
    throw new Error("Wrangler did not return one fixed deployment URL on the project's Preview domain");
  }
  return { deploymentId: row.deployment_id, baseUrl: candidates[0] };
}

export function inputHashes(lockfile: string | Buffer, catalog: string | Buffer): Verification["inputs"] {
  const digest = (input: string | Buffer) => createHash("sha256").update(input).digest("hex");
  return { lockfile: digest(lockfile), catalog: digest(catalog) };
}

export function routeCases(xml: string, manifest: { routes: Record<string, { srcRoute?: string | null }> }): string[] {
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => {
    const url = new URL(match[1]);
    if (url.origin !== SITE.url || !validPath(url.pathname)) {
      throw new Error("Unexpected origin or route in the built sitemap");
    }
    return url.pathname;
  });
  if (paths.length === 0) {
    throw new Error("The built sitemap contains no verification routes");
  }
  const selected = oneEachTemplate(paths, manifest) as string[];
  const ids = paths.map(p => p.match(/^\/en\/lenses\/x\/([^/]+-x)$/)?.[1]).filter(Boolean).slice(0, 2);
  if (ids.length === 2) {
    selected.push(`/en/lenses/x/compare?ids=${ids.join(",")}`);
  }
  return [...new Set(selected)];
}

export function previewHeaders(record: Verification, target: string, env: Record<string, string | undefined> = process.env): Record<string, string> {
  const id = env.PREVIEW_ACCESS_CLIENT_ID;
  const secret = env.PREVIEW_ACCESS_CLIENT_SECRET;
  if (Boolean(id) !== Boolean(secret)) {
    throw new Error("Both Preview Access credentials must be configured together");
  }
  if (new URL(target).origin !== record.baseUrl || !id || !secret) {
    return {};
  }
  return { "CF-Access-Client-Id": id, "CF-Access-Client-Secret": secret };
}

export function previewRequestPolicy(record: Verification, target: string, method: string): "pass" | "stub" | "block" {
  const url = new URL(target);
  if ((url.origin === record.baseUrl && url.pathname === "/api/track") ||
      (url.hostname === "cloudflareinsights.com" && url.pathname === "/cdn-cgi/rum")) {
    return "stub";
  }
  return ["GET", "HEAD", "OPTIONS"].includes(method) ? "pass" : "block";
}

export function verificationEnvironment(record?: Verification) {
  if (!record && process.env.PREVIEW_REQUIRED === "true") {
    throw new Error("Remote verification requires PREVIEW_VERIFICATION_FILE; refusing a local build");
  }
  return { remote: Boolean(record), baseURL: record?.baseUrl ?? "http://localhost:3100" };
}
