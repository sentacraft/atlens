import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import { SECRETS_NOT_ON_PREVIEWS, SECRETS_SHARED_WITH_PREVIEWS } from "../preview-secrets";

type Entry = Record<string, string>;
type Bindings = {
  vars?: Record<string, string>;
  analytics_engine_datasets?: Entry[];
  d1_databases?: Entry[];
  kv_namespaces?: Entry[];
  ratelimits?: Entry[];
  send_email?: Entry[];
  version_metadata?: Entry;
};
type Config = Bindings & { secrets: { required: string[] }; previews: Bindings };

const config = parse(readFileSync(path.resolve(process.cwd(), "wrangler.toml"), "utf8")) as unknown as Config;
const { previews } = config;

// Each kind with the field the runtime binding is named by.
const KINDS = [
  ["analytics_engine_datasets", "binding"],
  ["d1_databases", "binding"],
  ["kv_namespaces", "binding"],
  ["ratelimits", "name"],
  ["send_email", "name"],
] as const;

function byName(entries: Entry[] | undefined, key: string) {
  return new Map((entries ?? []).map((entry) => [entry[key], entry]));
}

describe("wrangler.toml previews", () => {
  it.each(KINDS)("declares every production %s binding again", (kind, key) => {
    expect([...byName(previews[kind], key).keys()].sort()).toEqual(
      [...byName(config[kind], key).keys()].sort(),
    );
  });

  it("declares every production var and the version metadata binding", () => {
    expect(Object.keys(previews.vars ?? {})).toEqual(
      expect.arrayContaining(Object.keys(config.vars ?? {})),
    );
    expect(previews.version_metadata).toEqual(config.version_metadata);
  });

  it("points storage at preview copies, never at production's", () => {
    const pairs = [
      ["analytics_engine_datasets", "binding", "dataset"],
      ["d1_databases", "binding", "database_id"],
      ["kv_namespaces", "binding", "id"],
      ["ratelimits", "name", "namespace_id"],
    ] as const;
    for (const [kind, key, field] of pairs) {
      const productionEntries = byName(config[kind], key);
      for (const [name, entry] of byName(previews[kind], key)) {
        expect(entry[field], `${kind} ${name}`).not.toBe(productionEntries.get(name)?.[field]);
      }
    }
  });

  it("lets `d1 migrations apply --preview` reach each preview database", () => {
    const previewDatabases = byName(previews.d1_databases, "binding");
    for (const database of config.d1_databases ?? []) {
      expect(database.preview_database_id).toBe(previewDatabases.get(database.binding)?.database_id);
    }
  });

  it("names only required secrets in the preview secret rules", () => {
    expect(config.secrets.required).toEqual(
      expect.arrayContaining([...SECRETS_NOT_ON_PREVIEWS, ...SECRETS_SHARED_WITH_PREVIEWS]),
    );
  });
});
