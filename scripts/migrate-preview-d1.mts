// Applies D1 migrations to the Worker Previews databases; the Workers Builds preview command runs
// it before `wrangler preview`.
//
// `d1 migrations apply` only finds databases in the top-level config, and `preview_database_id`
// would also become the local database of `wrangler dev`, so this runs against a generated config
// whose top-level D1 entries are the `[previews]` ones.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse, stringify } from "smol-toml";

type Database = { binding: string; database_name: string; database_id: string; migrations_dir: string };

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const config = parse(readFileSync(path.join(repoRoot, "wrangler.toml"), "utf8")) as {
  name: string;
  previews?: { d1_databases?: Database[] };
};
const databases = config.previews?.d1_databases ?? [];
if (databases.length === 0) {
  throw new Error("wrangler.toml declares no [[previews.d1_databases]]");
}

const dir = path.join(repoRoot, ".wrangler", "tmp");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, "wrangler.previews-d1.toml");
writeFileSync(
  file,
  stringify({
    name: config.name,
    d1_databases: databases.map((db) => ({ ...db, migrations_dir: path.join(repoRoot, db.migrations_dir) })),
  }),
);

for (const { binding } of databases) {
  execFileSync("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", binding, "--remote", "-c", file], {
    cwd: repoRoot,
    stdio: "inherit",
  });
}
