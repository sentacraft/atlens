// Applies pending D1 migrations to the local databases `next dev` and `pnpm run preview` read, so
// a migration merged from main cannot leave the local schema behind. Runs before both commands.

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { parse } from "smol-toml";

type Database = { database_name: string };

const run = promisify(execFile);
const repoRoot = (await run("git", ["rev-parse", "--show-toplevel"])).stdout.trim();
const config = parse(readFileSync(path.join(repoRoot, "wrangler.toml"), "utf8")) as {
  d1_databases?: Database[];
};

await Promise.all(
  (config.d1_databases ?? []).map(async ({ database_name: name }) => {
    // CI=true answers wrangler's "apply these migrations?" prompt, which would otherwise block dev.
    const { stdout } = await run("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", name, "--local"], {
      cwd: repoRoot,
      env: { ...process.env, CI: "true" },
    });
    const applied = stdout.split("\n").filter((line) => line.includes("✅") && line.includes(".sql"));
    for (const line of applied) {
      console.log(`[d1:migrate:local] ${name}: ${line.replace(/[│✅]/g, "").trim()}`);
    }
  }),
);
