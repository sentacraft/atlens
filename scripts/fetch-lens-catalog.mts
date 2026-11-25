#!/usr/bin/env node
// Downloads the lens catalog pinned in src/data/catalog-source.json from the pipeline repository
// into src/data/.
//
// Auth: LENS_CATALOG_TOKEN (a fine-grained token with read access to the pipeline repository's
// contents) in CI and Workers Builds; locally, the signed-in `gh` CLI. A matching
// src/data/.lens-catalog-commit skips the download, so the script needs no token once fetched.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src/data/catalog-source.json");
const stampPath = path.join(root, "src/data/.lens-catalog-commit");

interface CatalogFile {
  from: string;
  to: string;
  /** Written instead when the pinned commit predates the file. */
  ifMissing?: string;
}

const FILES: CatalogFile[] = [
  { from: "published/lenses.json", to: "src/data/lenses.json" },
  { from: "published/lenses-gfx.json", to: "src/data/lenses-gfx.json" },
  { from: "published/mtf-samples.json", to: "src/data/mtf-samples.json", ifMissing: "{}\n" },
];

const { repository, commit } = JSON.parse(readFileSync(sourcePath, "utf8")) as {
  repository: string;
  commit: string;
};
if (!/^[0-9a-f]{40}$/.test(commit)) {
  fail(`catalog-source.json: commit must be a full 40-character sha, got ${JSON.stringify(commit)}`);
}

function fail(message: string): never {
  console.error(`[catalog:fetch] ${message}`);
  process.exit(1);
}

function token(): string {
  if (process.env.LENS_CATALOG_TOKEN) {
    return process.env.LENS_CATALOG_TOKEN;
  }
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fail(
      `no LENS_CATALOG_TOKEN and no signed-in gh CLI; either can read ${repository}`,
    );
  }
}

async function github(apiPath: string, accept: string, auth: string, allowMissing = false): Promise<Response> {
  const response = await fetch(`https://api.github.com/repos/${repository}/${apiPath}`, {
    headers: { Accept: accept, Authorization: `Bearer ${auth}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok && !(allowMissing && response.status === 404)) {
    fail(`GET ${apiPath}: ${response.status} ${response.statusText}`);
  }
  return response;
}

// A pinned commit that only lives on an unmerged pipeline branch builds fine but disappears
// once that branch is deleted, so a production build refuses one that is not on the pipeline's main.
async function requireOnMain(auth: string): Promise<void> {
  const response = await github(`compare/${commit}...main`, "application/vnd.github+json", auth);
  const { status } = (await response.json()) as { status: string };
  if (status !== "ahead" && status !== "identical") {
    fail(`${commit} is not on ${repository} main (${status}); merge the pipeline's publish PR first`);
  }
}

const isProductionBuild = process.env.WORKERS_CI_BRANCH === "main";
const upToDate =
  existsSync(stampPath) &&
  readFileSync(stampPath, "utf8").trim() === commit &&
  FILES.every(({ to }) => existsSync(path.join(root, to)));

if (upToDate && !isProductionBuild) {
  process.exit(0);
}

const auth = token();
if (isProductionBuild) {
  await requireOnMain(auth);
}
for (const { from, to, ifMissing } of FILES) {
  const response = await github(`contents/${from}?ref=${commit}`, "application/vnd.github.raw+json", auth, ifMissing !== undefined);
  const text = response.status === 404 && ifMissing !== undefined ? ifMissing : await response.text();
  JSON.parse(text);
  const target = path.join(root, to);
  writeFileSync(`${target}.tmp`, text);
  renameSync(`${target}.tmp`, target);
}
writeFileSync(stampPath, `${commit}\n`);
console.log(`[catalog:fetch] lens catalog at ${repository}@${commit.slice(0, 7)}`);
