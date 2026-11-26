import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { preparePreview } from "../prepare-preview.mts";
import { publishPreview } from "../publish-preview.mts";
import { assertCurrent } from "../preview-workflow.mts";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "preview-test-"));
  directories.push(root);
  for (const name of ["src/data", ".open-next", ".next/server/app"]) {
    mkdirSync(path.join(root, name), { recursive: true });
  }
  writeFileSync(path.join(root, "pnpm-lock.yaml"), "lock");
  writeFileSync(path.join(root, "src/data/catalog-source.json"), "{}");
  writeFileSync(path.join(root, ".next/server/app/sitemap.xml.body"), '<urlset><loc>https://atlens.app/en/about</loc><loc>https://atlens.app/zh/about</loc></urlset>');
  writeFileSync(path.join(root, ".next/prerender-manifest.json"), JSON.stringify({ routes: {} }));
  execFileSync("git", ["init", "-q", "-b", "fixture"], { cwd: root });
  execFileSync("git", ["add", "pnpm-lock.yaml", "src"], { cwd: root });
  execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"], { cwd: root });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const env = { WORKERS_CI_BRANCH: "feat/example", WORKERS_CI_COMMIT_SHA: sha,
    WORKERS_CI_BUILD_UUID: "22222222-2222-4222-8222-222222222222", PREVIEW_DISPATCH_TOKEN: "test-token" };
  const build = preparePreview(root, env)!;
  return { root, env, build };
}

const deployment = { type: "preview", version: 1, worker_name: "atlens",
  deployment_id: "122c5506-1111-4111-8111-111111111111", deployment_urls: ["https://122c5506.preview.atlens.app"] };

describe("Cloudflare-only build handoff", () => {
  it("does not create metadata for production or local builds", () => {
    expect(preparePreview("/does-not-exist", {})).toBeUndefined();
    expect(preparePreview("/does-not-exist", { WORKERS_CI_BRANCH: "main" })).toBeUndefined();
  });

  it("publishes existing output and dispatches metadata without invoking a build", async () => {
    const { root, env, build } = fixture();
    const calls: string[][] = [];
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const record = await publishPreview({ root, env, send, run: (args, childEnv) => {
      calls.push(args);
      if (args.includes("preview")) {
        writeFileSync(childEnv.WRANGLER_OUTPUT_FILE_PATH!, JSON.stringify(deployment) + "\n");
      }
    } });
    expect(calls).toEqual([
      ["run", "d1:migrate:previews"],
      ["exec", "wrangler", "preview", "--name", env.WORKERS_CI_BRANCH, "--tag", build.sha, "--json"],
    ]);
    expect(record.sha).toBe(build.sha);
    expect(record.paths).toEqual(["/en/about", "/zh/about"]);
    const payload = JSON.parse(send.mock.calls[0][1]!.body as string);
    expect(payload.event_type).toBe("cloudflare_preview_ready");
    expect(payload.client_payload).toEqual(record);
    expect(JSON.stringify(payload)).not.toContain(env.PREVIEW_DISPATCH_TOKEN);
  });

  it("rejects missing credentials or modified build inputs before any side effects", async () => {
    const { root, env } = fixture();
    const run = vi.fn();
    await expect(publishPreview({ root, env: { ...env, PREVIEW_DISPATCH_TOKEN: "" }, run })).rejects.toThrow();
    writeFileSync(path.join(root, "pnpm-lock.yaml"), "changed");
    await expect(publishPreview({ root, env, run })).rejects.toThrow(/stale/);
    expect(run).not.toHaveBeenCalled();
  });

  it("fails notification rather than claiming verification passed", async () => {
    const { root, env } = fixture();
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 500 }));
    await expect(publishPreview({ root, env, send, run: (args, childEnv) => {
      if (args.includes("preview")) {
        writeFileSync(childEnv.WRANGLER_OUTPUT_FILE_PATH!, JSON.stringify(deployment) + "\n");
      }
    } })).rejects.toThrow(/notification failed/);
    expect(readFileSync(path.join(root, ".open-next/preview-verification.json"), "utf8")).not.toContain("test-token");
  });

  it("does not accept a stale branch head or a branch behind main", async () => {
    const { build } = fixture();
    const record = { ...build, deploymentId: deployment.deployment_id, baseUrl: deployment.deployment_urls[0] };
    vi.stubEnv("GH_TOKEN", "test-token");
    const request = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", request);
    request.mockResolvedValueOnce(Response.json({ commit: { sha: "b".repeat(40) } }));
    await expect(assertCurrent(record)).rejects.toThrow(/current branch head/);
    request.mockResolvedValueOnce(Response.json({ commit: { sha: build.sha } }));
    request.mockResolvedValueOnce(Response.json({ status: "diverged" }));
    await expect(assertCurrent(record)).rejects.toThrow(/current main/);
    request.mockResolvedValueOnce(Response.json({ commit: { sha: build.sha } }));
    request.mockResolvedValueOnce(Response.json({ status: "ahead" }));
    await expect(assertCurrent(record)).resolves.toBeUndefined();
  });
});
