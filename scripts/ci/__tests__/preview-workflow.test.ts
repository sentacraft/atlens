import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const receiver = read(".github/workflows/preview-smoke.yml");

describe("Preview smoke workflow", () => {
  it("serializes runs that report on the same commit", () => {
    expect(receiver).toContain("group: preview-smoke-${{ github.event.client_payload.sha }}");
  });

  it("always closes the status it opened, with no step that can fail before it", () => {
    const report = receiver.slice(receiver.indexOf("\n  report:"));
    expect(report).toContain("if: ${{ always() && needs.target.outputs.sha != '' }}");
    expect(report).not.toMatch(/^\s*(- )?uses:/m);
    expect(report).toContain("state=failure");
  });

  it("only runs for a dispatched deployment and never builds the app", () => {
    expect(receiver).not.toMatch(/^ {2}(pull_request|push|schedule|workflow_call|workflow_dispatch):/m);
    expect(receiver).not.toMatch(/next build|next start|wrangler dev|opennextjs-cloudflare|pnpm/);
  });

  it("leaves the Cloudflare build command unchanged until the Preview command is switched", () => {
    const { scripts } = JSON.parse(read("package.json"));
    expect(scripts["prebuild:cf"]).toBeUndefined();
    expect(scripts["postbuild:cf"]).toBeUndefined();
  });

  it("switches off only the local workerd smoke job", () => {
    expect(read(".github/workflows/cf-smoke.yml")).toContain("if: vars.CF_PREVIEW_VALIDATION != 'true'");
    for (const name of ["e2e", "text-fit-check"]) {
      expect(read(`.github/workflows/${name}.yml`)).not.toContain("CF_PREVIEW_VALIDATION");
    }
  });
});
