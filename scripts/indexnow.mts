import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { routing } from "@/i18n/routing";
import { changedPages, deployedRange, lensMetadataChanged, submissionUrls, type CatalogSource, type SiteSnapshot } from "./lib/indexnow";

// The key is public by design: search engines verify it at /<key>.txt.
const KEY = "e5998ce671331f5c3b7dc0fb0bb2399e";
const PRODUCTION_CHECK = "Workers Builds: atlens";
const MAX_BATCH_SIZE = 10_000;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {throw new Error(`${name} is required`);}
  return value;
}

const repository = required("GITHUB_REPOSITORY");
const base = new URL(required("BASE_URL")).origin;
const dryRun = process.env.INDEXNOW_DRY_RUN === "true";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const at = <T,>(ref: string, path: string): T => JSON.parse(git("show", `${ref}:${path}`));

async function github<T>(repo: string, path: string, token: string, accept = "application/vnd.github+json"): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    headers: { Accept: accept, Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok) {throw new Error(`GitHub ${path}: ${response.status}`);}
  return response.json() as Promise<T>;
}

async function isProductionDeploy(revision: string): Promise<boolean> {
  const { check_runs } = await github<{ check_runs: { app: { slug: string }; conclusion: string | null }[] }>(
    repository, `commits/${revision}/check-runs?check_name=${encodeURIComponent(PRODUCTION_CHECK)}`, required("GH_TOKEN"),
  );
  return check_runs.some((check) => check.app.slug === "cloudflare-workers-and-pages" && check.conclusion === "success");
}

async function loadCatalog({ repository, commit }: CatalogSource): Promise<SiteSnapshot["lenses"]> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(commit)) {
    throw new Error("Invalid catalog source pin");
  }
  const load = (file: string) => github<SiteSnapshot["lenses"]["X"]>(
    repository, `contents/published/${file}?ref=${commit}`, required("LENS_CATALOG_TOKEN"), "application/vnd.github.raw+json",
  );
  const [X, G] = await Promise.all([load("lenses.json"), load("lenses-gfx.json")]);
  return { X, G };
}

function readSnapshot(ref: string): SiteSnapshot {
  const collections = at<{ groups: Record<string, SiteSnapshot["collections"]> }>(ref, "src/data/collections.json");
  return {
    lenses: { X: [], G: [] },
    brands: at(ref, "src/data/brands.json"),
    collections: Object.values(collections.groups).flat(),
    messages: Object.fromEntries(routing.locales.map((locale) => [locale, at(ref, `src/messages/${locale}.json`)])),
  };
}

async function main() {
  const revisions = git("rev-list", "--first-parent", "--max-count=30", "HEAD").split("\n");
  const range = await deployedRange(revisions, isProductionDeploy, process.env.INDEXNOW_DEPLOYED_SHA || undefined);
  console.log(`Comparing production deployments ${range.before.slice(0, 8)} and ${range.after.slice(0, 8)}.`);
  const before = readSnapshot(range.before);
  const after = readSnapshot(range.after);
  const oldPin = at<CatalogSource>(range.before, "src/data/catalog-source.json");
  const newPin = at<CatalogSource>(range.after, "src/data/catalog-source.json");
  if (!isDeepStrictEqual(oldPin, newPin)) {
    [before.lenses, after.lenses] = await Promise.all([loadCatalog(oldPin), loadCatalog(newPin)]);
  } else if (routing.locales.some((locale) => lensMetadataChanged(before, after, locale))) {
    before.lenses = after.lenses = await loadCatalog(newPin);
  }

  const delta = changedPages(before, after);
  if (!delta.live.length && !delta.removed.length) {
    console.log("No changed indexable URLs.");
    return;
  }
  const sitemap = await fetch(`${base}/sitemap.xml`);
  if (!sitemap.ok) {throw new Error(`Production sitemap returned ${sitemap.status}`);}
  const urls = submissionUrls(base, await sitemap.text(), delta);
  if (dryRun) {
    console.log(`Dry run: ${urls.length} changed URL(s).`, ...urls.map((url) => `\n${url}`));
    return;
  }

  for (let offset = 0; offset < urls.length; offset += MAX_BATCH_SIZE) {
    const urlList = urls.slice(offset, offset + MAX_BATCH_SIZE);
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(base).host, key: KEY, keyLocation: `${base}/${KEY}.txt`, urlList }),
    });
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow returned ${response.status}: ${await response.text()}`);
    }
    console.log(`Submitted ${urlList.length} changed URL(s) to IndexNow (${response.status}).`);
  }
  if (!urls.length) {console.log("No changed URLs matched the production sitemap.");}
}

await main();
