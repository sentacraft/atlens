import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publishPreview } from "../publish-preview.mts";

const sha = "a".repeat(40);
const buildId = "22222222-2222-4222-8222-222222222222";
const env = { WORKERS_CI_BRANCH: "feat/example", WORKERS_CI_COMMIT_SHA: sha, WORKERS_CI_BUILD_UUID: buildId,
  PREVIEW_STATUS_TOKEN: "test-token" };
const deployment = { type: "preview", version: 1, worker_name: "atlens",
  deployment_id: "122c5506-1111-4111-8111-111111111111", deployment_urls: ["https://122c5506.preview.atlens.app"] };

const temporaryDirs: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function deploy(args: string[], childEnv: Record<string, string | undefined>) {
  if (args.includes("preview")) {
    writeFileSync(childEnv.WRANGLER_OUTPUT_FILE_PATH!, JSON.stringify(deployment) + "\n");
  }
}

describe("Preview publisher", () => {
  it("deploys existing output and posts the fixed deployment on the built commit", async () => {
    const calls: string[][] = [];
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    await publishPreview({ env, send, run: (args, childEnv) => {
      calls.push(args);
      deploy(args, childEnv);
    } });
    expect(calls).toEqual([
      ["run", "d1:migrate:previews"],
      ["exec", "wrangler", "preview", "--name", env.WORKERS_CI_BRANCH, "--tag", sha],
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe(`https://api.github.com/repos/sentacraft/atlens/statuses/${sha}`);
    const body = send.mock.calls[0][1]!.body as string;
    expect(JSON.parse(body)).toEqual({
      state: "success",
      context: "cloudflare/preview-deployment",
      target_url: deployment.deployment_urls[0],
      description: `deployment=${deployment.deployment_id} build=${buildId}`,
    });
    expect(body).not.toContain(env.PREVIEW_STATUS_TOKEN);
  });

  it("preserves WRANGLER_OUTPUT_FILE_DIRECTORY when Workers Builds provides it", async () => {
    const outputDir = mkdtempSync(path.join(tmpdir(), "wrangler-dir-"));
    temporaryDirs.push(outputDir);
    writeFileSync(path.join(outputDir, "wrangler-output-prior.json"), JSON.stringify({
      type: "preview", version: 1, deployment_id: "00000000-0000-4000-8000-000000000000",
      deployment_urls: ["https://00000000.preview.atlens.app"],
    }) + "\n");

    const writtenFile = path.join(outputDir, "wrangler-output-new.json");
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    await publishPreview({
      env: { ...env, WRANGLER_OUTPUT_FILE_DIRECTORY: outputDir },
      send,
      run: (args, childEnv) => {
        if (!args.includes("preview")) {
          return;
        }
        expect(childEnv.WRANGLER_OUTPUT_FILE_PATH).toBeUndefined();
        expect(childEnv.WRANGLER_OUTPUT_FILE_DIRECTORY).toBe(outputDir);
        writeFileSync(writtenFile, JSON.stringify(deployment) + "\n");
      },
    });

    expect(existsSync(writtenFile)).toBe(true);
    expect(JSON.parse(send.mock.calls[0][1]!.body as string)).toMatchObject({
      target_url: deployment.deployment_urls[0],
    });
  });

  it("preserves WRANGLER_OUTPUT_FILE_PATH and reads only newly appended records", async () => {
    const outputDir = mkdtempSync(path.join(tmpdir(), "wrangler-file-"));
    temporaryDirs.push(outputDir);
    const outputPath = path.join(outputDir, "wrangler.jsonl");
    writeFileSync(outputPath, JSON.stringify({
      type: "preview", version: 1, deployment_id: "00000000-0000-4000-8000-000000000000",
      deployment_urls: ["https://00000000.preview.atlens.app"],
    }) + "\n");

    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    await publishPreview({
      env: { ...env, WRANGLER_OUTPUT_FILE_PATH: outputPath },
      send,
      run: (args, childEnv) => {
        if (!args.includes("preview")) {
          return;
        }
        expect(childEnv.WRANGLER_OUTPUT_FILE_PATH).toBe(outputPath);
        appendFileSync(outputPath, JSON.stringify(deployment) + "\n");
      },
    });

    expect(readFileSync(outputPath, "utf8")).toContain(deployment.deployment_id);
    expect(JSON.parse(send.mock.calls[0][1]!.body as string)).toMatchObject({
      target_url: deployment.deployment_urls[0],
    });
  });

  it.each([
    ["no token", { PREVIEW_STATUS_TOKEN: "" }],
    ["the production branch", { WORKERS_CI_BRANCH: "main" }],
    ["no branch", { WORKERS_CI_BRANCH: undefined }],
    ["no commit", { WORKERS_CI_COMMIT_SHA: undefined }],
    ["no build UUID", { WORKERS_CI_BUILD_UUID: undefined }],
  ])("has no side effects with %s", async (_name, change) => {
    const run = vi.fn();
    const send = vi.fn<typeof fetch>();
    await expect(publishPreview({ env: { ...env, ...change }, run, send })).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("fails the build when the status is rejected", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(publishPreview({ env, send, run: deploy })).rejects.toThrow(/status was rejected \(HTTP 403\)/);
  });
});
