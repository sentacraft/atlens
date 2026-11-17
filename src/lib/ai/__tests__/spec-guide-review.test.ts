import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function review(file: string): string {
  const output = execFileSync(process.execPath, ["--import", "tsx", "scripts/hooks/site-facts-review.mjs"], {
    cwd: root,
    input: JSON.stringify({ cwd: root, tool_input: { file_path: path.join(root, file) } }),
    encoding: "utf8",
  });
  return output ? JSON.parse(output).hookSpecificOutput.additionalContext : "";
}

describe("spec guide source review", () => {
  it.each(["src/lib/types.ts", "src/lib/lens/lens.ts"])("names the guide when %s changes", (file) => {
    const context = review(file);
    expect(context).toContain("src/lib/ai/spec-guide.ts");
    expect(context).not.toMatch(/skill documents|ai\/skills/);
  });

  it("does not request a guide review for unrelated changes", () => {
    expect(review("src/lib/ai/iris-quota.ts")).not.toContain("spec guide");
  });
});
