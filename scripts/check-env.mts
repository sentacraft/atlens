// Warns when a secret listed in wrangler.toml's `secrets.required` has no local value.
// Wrangler performs the same check under `pnpm run preview`, but `next dev` loads
// .env files itself and never consults Wrangler, so predev runs this instead.
// Warn-only: some production secrets (e.g. RATE_LIMIT_BYPASS) are optional locally.

import { existsSync, readFileSync } from "node:fs";

function readRequiredSecrets(): string[] {
  const toml = readFileSync("wrangler.toml", "utf8");
  const section = toml.match(/^\[secrets\]\s*\nrequired\s*=\s*\[([^\]]*)\]/m);
  if (!section) {
    return [];
  }
  return [...section[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

// Same files `next dev` loads, minus the committed .env.development.
function readLocalKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of [".env.development.local", ".env.local", ".env"]) {
    if (!existsSync(file)) {
      continue;
    }
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match && match[2].trim() !== "") {
        keys.add(match[1]);
      }
    }
  }
  return keys;
}

const localKeys = readLocalKeys();
const missing = readRequiredSecrets().filter((name) => !localKeys.has(name));

if (missing.length > 0) {
  console.warn(
    `[env:check] Missing local values for production secrets: ${missing.join(", ")}\n` +
      "            Add them to .env.local (see .env.example) if this session needs them.",
  );
}
