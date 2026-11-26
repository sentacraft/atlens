import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deploymentFromOutput, parseTarget, statusDescription, targetFromStatus, type PreviewTarget } from "../preview-target.mts";

const id = "122c5506-1111-4111-8111-111111111111";
// Repositories and domains in these fixtures verify the project's deployment boundary.
const target: PreviewTarget = {
  sha: "a".repeat(40),
  deploymentId: id,
  buildId: "22222222-2222-4222-8222-222222222222",
  baseUrl: "https://122c5506.preview.atlens.app",
};
const status = { sha: target.sha, targetUrl: target.baseUrl, description: statusDescription(target) };
const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Preview target", () => {
  it("accepts a fixed deployment", () => {
    expect(parseTarget(target)).toEqual(target);
  });

  it.each([
    ["production", { baseUrl: "https://atlens.app" }],
    ["mutable branch URL", { baseUrl: "https://feature.preview.atlens.app" }],
    ["unrelated deployment", { baseUrl: "https://abcdef12.preview.atlens.app" }],
    ["host suffix attack", { baseUrl: "https://122c5506.preview.atlens.app.attacker.test" }],
    ["credentials", { baseUrl: "https://token@122c5506.preview.atlens.app" }],
    ["HTTP", { baseUrl: "http://122c5506.preview.atlens.app" }],
    ["port", { baseUrl: "https://122c5506.preview.atlens.app:8443" }],
    ["URL path", { baseUrl: "https://122c5506.preview.atlens.app/admin" }],
    ["branch name as SHA", { sha: "main" }],
    ["invalid deployment ID", { deploymentId: "122c5506" }],
    ["invalid build UUID", { buildId: "122c5506" }],
  ])("rejects %s", (_name, change) => {
    expect(() => parseTarget({ ...target, ...change })).toThrow();
  });

  it("round-trips the deployment through a commit status", () => {
    expect(targetFromStatus(status)).toEqual(target);
    expect(status.description.length).toBeLessThanOrEqual(140);
  });

  it.each([
    ["no description", { description: "" }],
    ["a truncated description", { description: status.description.slice(0, -1) }],
    ["an appended line", { description: `${status.description}\nbase_url=https://attacker.test` }],
    ["no target URL", { targetUrl: "" }],
    ["another deployment's URL", { targetUrl: "https://abcdef12.preview.atlens.app" }],
  ])("rejects a status with %s", (_name, change) => {
    expect(() => targetFromStatus({ ...status, ...change })).toThrow();
  });

  it("selects deployment_urls rather than preview_urls from Wrangler's output file", () => {
    const output = [
      JSON.stringify({ type: "unrelated" }),
      JSON.stringify({ type: "preview", version: 1, worker_name: "atlens", deployment_id: id,
        deployment_urls: [target.baseUrl], preview_urls: ["https://feature.preview.atlens.app"] }),
    ].join("\n");
    expect(deploymentFromOutput(output)).toEqual({ deploymentId: id, baseUrl: target.baseUrl });
  });

  it("does not guess an address when deployment output is missing or ambiguous", () => {
    expect(() => deploymentFromOutput("{}")).toThrow();
    const line = JSON.stringify({ type: "preview", version: 1, worker_name: "atlens",
      deployment_id: id, deployment_urls: [target.baseUrl] });
    expect(() => deploymentFromOutput(`${line}\n${line}`)).toThrow();
    expect(() => deploymentFromOutput(JSON.stringify({ type: "preview", version: 1, worker_name: "atlens",
      deployment_id: id, deployment_urls: [], preview_urls: [target.baseUrl] }))).toThrow();
  });

  it("writes the validated address from status fields in the environment, under plain Node", () => {
    const root = mkdtempSync(path.join(tmpdir(), "preview-target-"));
    temporary.push(root);
    const output = path.join(root, "output");
    writeFileSync(output, "");
    execFileSync(process.execPath, ["--experimental-strip-types", path.resolve(import.meta.dirname, "../preview-target.mts")], {
      env: { ...process.env, GITHUB_OUTPUT: output, STATUS_SHA: status.sha,
        STATUS_TARGET_URL: status.targetUrl, STATUS_DESCRIPTION: status.description },
    });
    expect(readFileSync(output, "utf8")).toBe(`base_url=${target.baseUrl}\n`);
  });
});
