// Adds a secret to wrangler.toml `[secrets] required`, .env.example, every checkout's
// .env.local, and production with --prod.
//
// Usage:
//   pnpm run secret:add NAME                 prompt for the local value
//   pnpm run secret:add NAME --generate      random local value (self-owned secrets)
//   pnpm run secret:add NAME --prod          also prompt for and upload the production value
//   pnpm run secret:add NAME --generate --prod   independent random values for each
//   pnpm run secret:add NAME --prod --skip-local  production only, local already set

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const name = args.find((arg) => !arg.startsWith("--"));
const generate = args.includes("--generate");
const prod = args.includes("--prod");
const skipLocal = args.includes("--skip-local");

if (!name || !/^[A-Z][A-Z0-9_]*$/.test(name)) {
  console.error(
    "Usage: pnpm run secret:add NAME [--generate] [--prod] [--skip-local]  (NAME in UPPER_SNAKE_CASE)",
  );
  process.exit(1);
}

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

// Raw mode, so the value is never echoed.
async function promptHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error(`${label}: no terminal to prompt on; rerun interactively or pass --generate`);
  }
  process.stdout.write(`${label}: `);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  let value = "";
  return new Promise((resolve, reject) => {
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on("data", onData);
  });
}

function addToWranglerToml(): boolean {
  const file = path.join(repoRoot, "wrangler.toml");
  const toml = readFileSync(file, "utf8");
  const section = toml.match(/^\[secrets\]\s*\nrequired\s*=\s*\[([^\]]*)\]/m);
  if (!section) {
    throw new Error("wrangler.toml has no `[secrets] required` list");
  }
  const names = [...section[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  if (names.includes(name!)) {
    return false;
  }
  const list = [...names, name!].sort().map((entry) => `  "${entry}",`).join("\n");
  writeFileSync(file, toml.replace(section[0], `[secrets]\nrequired = [\n${list}\n]`));
  return true;
}

function addToEnvExample(): boolean {
  const file = path.join(repoRoot, ".env.example");
  const content = readFileSync(file, "utf8");
  if (new RegExp(`^${name}=`, "m").test(content)) {
    return false;
  }
  writeFileSync(file, `${content.replace(/\n*$/, "\n")}\n# TODO: describe ${name}.\n${name}=\n`);
  return true;
}

function listCheckouts(): string[] {
  const porcelain = execFileSync("git", ["worktree", "list", "--porcelain"], { encoding: "utf8" });
  return porcelain
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length))
    .filter((dir) => existsSync(dir));
}

function upsertEnvLocal(dir: string, value: string): "added" | "updated" | "unchanged" {
  const file = path.join(dir, ".env.local");
  const line = `${name}=${value}`;
  const content = existsSync(file) ? readFileSync(file, "utf8") : "";
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(content)) {
    const next = content.replace(pattern, line);
    if (next === content) {
      return "unchanged";
    }
    writeFileSync(file, next, { mode: 0o600 });
    return "updated";
  }
  writeFileSync(file, `${content.replace(/\n*$/, content ? "\n" : "")}${line}\n`, { mode: 0o600 });
  return "added";
}

// Collected before any write, so a cancelled prompt leaves nothing half-registered.
async function collectValues(): Promise<{ local?: string; production?: string }> {
  const local = skipLocal
    ? undefined
    : generate
      ? generateSecret()
      : await promptHidden(`Local value for ${name}`);
  const production = !prod
    ? undefined
    : generate
      ? generateSecret()
      : await promptHidden(`Production value for ${name}`);
  if (local === "" || production === "") {
    throw new Error("Empty value; nothing written");
  }
  return { local, production };
}

let values: { local?: string; production?: string };
try {
  values = await collectValues();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(addToWranglerToml() ? "wrangler.toml: added" : "wrangler.toml: already listed");
console.log(
  addToEnvExample() ? ".env.example: added (fill in its description)" : ".env.example: already listed",
);

if (values.local) {
  for (const dir of listCheckouts()) {
    console.log(`${path.relative(repoRoot, dir) || "."}/.env.local: ${upsertEnvLocal(dir, values.local)}`);
  }
}

if (values.production) {
  const result = spawnSync("pnpm", ["exec", "wrangler", "secret", "put", name], {
    cwd: repoRoot,
    input: values.production,
    stdio: ["pipe", "inherit", "inherit"],
  });
  process.exit(result.status ?? 1);
}
console.log(`Production not touched. Run \`pnpm run secret:add ${name} --prod --skip-local\` to upload it.`);
