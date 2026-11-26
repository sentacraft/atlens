import { writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { publishPreview } from "../publish-preview.mts";

const sha = "a".repeat(40);
const env = { WORKERS_CI_BRANCH: "feat/example", WORKERS_CI_COMMIT_SHA: sha, PREVIEW_DISPATCH_TOKEN: "test-token" };
const deployment = { type: "preview", version: 1, worker_name: "atlens",
  deployment_id: "122c5506-1111-4111-8111-111111111111", deployment_urls: ["https://122c5506.preview.atlens.app"] };

function deploy(args: string[], childEnv: Record<string, string | undefined>) {
  if (args.includes("preview")) {
    writeFileSync(childEnv.WRANGLER_OUTPUT_FILE_PATH!, JSON.stringify(deployment) + "\n");
  }
}

describe("Preview publisher", () => {
  it("deploys existing output and dispatches the fixed deployment without invoking a build", async () => {
    const calls: string[][] = [];
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    await publishPreview({ env, send, run: (args, childEnv) => {
      calls.push(args);
      deploy(args, childEnv);
    } });
    expect(calls).toEqual([
      ["run", "d1:migrate:previews"],
      ["exec", "wrangler", "preview", "--name", env.WORKERS_CI_BRANCH, "--tag", sha, "--json"],
    ]);
    const body = send.mock.calls[0][1]!.body as string;
    expect(JSON.parse(body)).toEqual({
      event_type: "cloudflare_preview_ready",
      client_payload: { sha, deploymentId: deployment.deployment_id, baseUrl: deployment.deployment_urls[0] },
    });
    expect(body).not.toContain(env.PREVIEW_DISPATCH_TOKEN);
  });

  it.each([
    ["no token", { PREVIEW_DISPATCH_TOKEN: "" }],
    ["the production branch", { WORKERS_CI_BRANCH: "main" }],
    ["no branch", { WORKERS_CI_BRANCH: undefined }],
    ["no commit", { WORKERS_CI_COMMIT_SHA: undefined }],
  ])("has no side effects with %s", async (_name, change) => {
    const run = vi.fn();
    const send = vi.fn<typeof fetch>();
    await expect(publishPreview({ env: { ...env, ...change }, run, send })).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("fails the build when the notification is rejected", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(publishPreview({ env, send, run: deploy })).rejects.toThrow(/notification failed \(HTTP 403\)/);
  });
});
