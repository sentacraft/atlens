import { describe, expect, it } from "vitest";

import { planSecretPut } from "../secret-put-command.mts";

const versions = [
  { id: "v2", metadata: { created_on: "2026-10-15T10:00:00.000000Z" } },
  { id: "v3", metadata: { created_on: "2026-10-16T10:00:00.000000Z" } },
  { id: "v1", metadata: { created_on: "2026-10-14T10:00:00.000000Z" } },
];

function fakeWrangler(deployed: { version_id: string; percentage: number }[]) {
  const calls: string[][] = [];
  const run = (args: string[]) => {
    calls.push(args);
    if (args.join(" ") === "versions list --json") {
      return versions;
    }
    if (args.join(" ") === "deployments status --json") {
      return { versions: deployed };
    }
    throw new Error(`unexpected wrangler ${args.join(" ")}`);
  };
  return { run, calls };
}

describe("planSecretPut", () => {
  it("uses secret put when the latest version serves all traffic", () => {
    const { run, calls } = fakeWrangler([{ version_id: "v3", percentage: 100 }]);
    expect(planSecretPut("API_KEY", run)).toEqual({
      kind: "deploy",
      args: ["secret", "put", "API_KEY"],
    });
    expect(calls).toEqual([
      ["versions", "list", "--json"],
      ["deployments", "status", "--json"],
    ]);
  });

  it("uses versions secret put when an older version is deployed", () => {
    const { run } = fakeWrangler([{ version_id: "v2", percentage: 100 }]);
    expect(planSecretPut("API_KEY", run)).toEqual({
      kind: "version-only",
      args: ["versions", "secret", "put", "API_KEY"],
      latestVersionId: "v3",
    });
  });

  it("uses versions secret put when the latest version is only part of a gradual deployment", () => {
    const { run } = fakeWrangler([
      { version_id: "v2", percentage: 50 },
      { version_id: "v3", percentage: 50 },
    ]);
    expect(planSecretPut("API_KEY", run).kind).toBe("version-only");
  });

  it("refuses to guess when wrangler lists no versions", () => {
    expect(() => planSecretPut("API_KEY", () => [])).toThrow(/no versions/);
  });
});
