import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deploymentFromOutput, inputHashes, parseBuildRecord, parseVerification, repository } from "./preview-contract.mts";
import { buildRecordPath } from "./prepare-preview.mts";

type Run = (args: string[], env: Record<string, string | undefined>) => void;

export async function publishPreview({ root = process.cwd(), env = process.env,
  run = (args: string[], childEnv: Record<string, string | undefined>) => {
    execFileSync("pnpm", args, { cwd: root, env: { ...process.env, ...childEnv }, stdio: "inherit" });
  }, send = fetch,
}: { root?: string; env?: Record<string, string | undefined>; run?: Run; send?: typeof fetch } = {}) {
  if (!env.PREVIEW_DISPATCH_TOKEN || !env.WORKERS_CI_BRANCH || env.WORKERS_CI_BRANCH === "main") {
    throw new Error("Preview publishing requires a non-production Cloudflare build and PREVIEW_DISPATCH_TOKEN");
  }
  const build = parseBuildRecord(JSON.parse(readFileSync(path.join(root, buildRecordPath), "utf8")));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const inputs = inputHashes(readFileSync(path.join(root, "pnpm-lock.yaml")), readFileSync(path.join(root, "src/data/catalog-source.json")));
  if (build.sha !== head || build.sha !== env.WORKERS_CI_COMMIT_SHA || build.branch !== env.WORKERS_CI_BRANCH ||
      build.buildId !== env.WORKERS_CI_BUILD_UUID || JSON.stringify(build.inputs) !== JSON.stringify(inputs)) {
    throw new Error("Refusing stale or mismatched Preview build output");
  }
  const temporary = mkdtempSync(path.join(tmpdir(), "preview-publish-"));
  try {
    const output = path.join(temporary, "wrangler.jsonl");
    run(["run", "d1:migrate:previews"], env);
    run(["exec", "wrangler", "preview", "--name", build.branch, "--tag", build.sha, "--json"], {
      ...env, WRANGLER_OUTPUT_FILE_PATH: output,
    });
    const record = parseVerification({ ...build, ...deploymentFromOutput(readFileSync(output, "utf8")) });
    const response = await send(`https://api.github.com/repos/${repository}/dispatches`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${env.PREVIEW_DISPATCH_TOKEN}`, Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "cloudflare_preview_ready", client_payload: record }),
    });
    if (response.status !== 204) {
      throw new Error(`Preview deployed, but verification notification failed (HTTP ${response.status}); no test success was recorded`);
    }
    return record;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await publishPreview();
}
