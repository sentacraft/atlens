// Copies the review findings in the remote preview catalog into the local `atlens-catalog`, so
// `next dev`, `pnpm run preview` and the AskIris eval read the same lens_reviews rows a branch
// preview does. The local table is replaced; run it again to pick up a new publish.
//
// `d1 export` only finds databases in the top-level config, and the preview catalog is declared
// only under [previews], so the export runs against a generated config naming just that database.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse, stringify } from "smol-toml";

type Database = { binding: string; database_name: string; database_id: string };

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const config = parse(readFileSync(path.join(repoRoot, "wrangler.toml"), "utf8")) as {
  name: string;
  d1_databases?: Database[];
  previews?: { d1_databases?: Database[] };
};
const local = config.d1_databases?.find((db) => db.binding === "CATALOG_DB");
const preview = config.previews?.d1_databases?.find((db) => db.binding === "CATALOG_DB");
if (!local || !preview) {
  throw new Error("wrangler.toml declares no CATALOG_DB, at the top level and under [previews]");
}

const dir = path.join(repoRoot, ".wrangler", "tmp");
mkdirSync(dir, { recursive: true });
const previewConfig = path.join(dir, "wrangler.preview-catalog.toml");
writeFileSync(previewConfig, stringify({ name: config.name, d1_databases: [preview] }));
const dump = path.join(dir, "lens_reviews.sql");

const wrangler = (...args: string[]) =>
  execFileSync("pnpm", ["exec", "wrangler", "d1", ...args], { cwd: repoRoot, stdio: "inherit" });
wrangler("export", preview.database_name, "--remote", "--table", "lens_reviews", "--no-schema", "--output", dump, "-c", previewConfig);
wrangler("execute", local.database_name, "--local", "--command", "DELETE FROM lens_reviews");
wrangler("execute", local.database_name, "--local", "--file", dump);
console.log(`[d1:pull:catalog] local ${local.database_name} now matches ${preview.database_name}`);
