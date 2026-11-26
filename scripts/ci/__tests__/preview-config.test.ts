import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { previewRequestPolicy, type Verification } from "../preview-contract.mts";

const record: Verification = {
  version: 1, repository: "sentacraft/atlens", sha: "a".repeat(40), branch: "feat/example",
  buildId: "22222222-2222-4222-8222-222222222222", deploymentId: "122c5506-1111-4111-8111-111111111111",
  baseUrl: "https://122c5506.preview.atlens.app", paths: ["/en/about", "/zh/about"],
  inputs: { lockfile: "b".repeat(64), catalog: "c".repeat(64) },
};
const temporary: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  for (const directory of temporary.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("remote test configuration", () => {
  it("has no local server, no global credentials and no service-worker routing bypass", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "preview-config-"));
    temporary.push(root);
    const file = path.join(root, "verification.json");
    writeFileSync(file, JSON.stringify(record));
    vi.stubEnv("PREVIEW_VERIFICATION_FILE", file);
    vi.stubEnv("PREVIEW_REQUIRED", "true");
    const { default: config } = await import("../../../playwright.config.ts");
    expect(config.webServer).toBeUndefined();
    expect(config.use?.baseURL).toBe(record.baseUrl);
    expect(config.use?.extraHTTPHeaders).toBeUndefined();
    expect(config.use?.serviceWorkers).toBe("block");
  });

  it("does not silently start a build when remote metadata is missing", async () => {
    vi.stubEnv("PREVIEW_VERIFICATION_FILE", "");
    vi.stubEnv("PREVIEW_REQUIRED", "true");
    await expect(import("../../../playwright.config.ts")).rejects.toThrow(/refusing a local build/);
  });

  it("blocks live mutations and stubs analytics while allowing reads", () => {
    expect(previewRequestPolicy(record, record.baseUrl + "/api/chat", "POST")).toBe("block");
    expect(previewRequestPolicy(record, record.baseUrl + "/api/feedback", "POST")).toBe("block");
    expect(previewRequestPolicy(record, "https://external.test/email", "POST")).toBe("block");
    expect(previewRequestPolicy(record, record.baseUrl + "/api/track", "POST")).toBe("stub");
    expect(previewRequestPolicy(record, record.baseUrl + "/en/about", "GET")).toBe("pass");
  });

  it("requires every browser spec to use the guarded fixture", () => {
    const root = path.resolve(import.meta.dirname, "../../../e2e");
    const specs = readdirSync(root).filter(f => f.endsWith(".spec.ts"));
    expect(specs.length).toBeGreaterThan(0);
    for (const spec of specs) {
      const source = readFileSync(path.join(root, spec), "utf8");
      expect(source, spec).toMatch(/import\s*\{[^\n]*\btest\b[^\n]*\}\s*from "\.\/support\/test"/);
    }
  });

  it("keeps the remote workflow free of application builds and local services", () => {
    const workflow = readFileSync(path.resolve(import.meta.dirname, "../../../.github/workflows/preview-validation.yml"), "utf8");
    expect(workflow).not.toMatch(/(?:next build|next start|wrangler dev|opennextjs-cloudflare build|pnpm run build)/);
    expect(workflow).toContain('PREVIEW_REQUIRED: "true"');
    expect(workflow).toContain("--grep-invert \"@local-only\"");
    for (const name of ["cf-smoke", "e2e", "text-fit-check"]) {
      const legacy = readFileSync(path.resolve(import.meta.dirname, `../../../.github/workflows/${name}.yml`), "utf8");
      expect(legacy).toContain("vars.CF_PREVIEW_VALIDATION != 'true'");
    }
  });
});
