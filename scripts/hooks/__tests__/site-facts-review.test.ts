import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const hook = fileURLToPath(new URL("../site-facts-review.mjs", import.meta.url));

function runHook(file: string) {
  return spawnSync(process.execPath, [hook], {
    cwd: root,
    input: JSON.stringify({
      cwd: root,
      tool_name: "Edit",
      tool_input: { file_path: resolve(root, file) },
    }),
    encoding: "utf8",
    timeout: 15_000,
  });
}

describe("site-facts-review hook", () => {
  it("loads application imports with tsconfig aliases through the native Node command", () => {
    const result = runHook("README.md");

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(output.hookSpecificOutput.additionalContext).toContain("- pipeline:");
  });

  it("reports the fact backed by the imported quota configuration", () => {
    const result = runHook("src/lib/ai/iris-quota.ts");

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).hookSpecificOutput.additionalContext).toContain("- rate-limit:");
  });

  it("accepts an unrelated edit without reporting source-backed facts", () => {
    const result = runHook(".skillshare/config.yaml");

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("The latest edit touched code or docs that these site facts restate");
  });
});
