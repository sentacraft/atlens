import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inputHashes, parseBuildRecord, repository, routeCases, type BuildRecord } from "./preview-contract.mts";

export const buildRecordPath = ".open-next/preview-verification.json";

export function preparePreview(root = process.cwd(), env: Record<string, string | undefined> = process.env): BuildRecord | undefined {
  if (!env.WORKERS_CI_BRANCH || env.WORKERS_CI_BRANCH === "main") {
    return;
  }
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (sha !== env.WORKERS_CI_COMMIT_SHA || !env.WORKERS_CI_BUILD_UUID) {
    throw new Error("Cloudflare build identity does not match the checkout");
  }
  const record: BuildRecord = {
    version: 1, repository, sha, branch: env.WORKERS_CI_BRANCH, buildId: env.WORKERS_CI_BUILD_UUID,
    paths: routeCases(
      readFileSync(path.join(root, ".next/server/app/sitemap.xml.body"), "utf8"),
      JSON.parse(readFileSync(path.join(root, ".next/prerender-manifest.json"), "utf8")),
    ),
    inputs: inputHashes(readFileSync(path.join(root, "pnpm-lock.yaml")), readFileSync(path.join(root, "src/data/catalog-source.json"))),
  };
  parseBuildRecord(record);
  writeFileSync(path.join(root, buildRecordPath), JSON.stringify(record) + "\n", { mode: 0o600 });
  return record;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  preparePreview();
}
