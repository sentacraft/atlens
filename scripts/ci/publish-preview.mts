import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deploymentFromOutput, parseTarget, repository, statusContext, statusDescription } from "./preview-target.mts";

type Env = Record<string, string | undefined>;
type Run = (args: string[], env: Env) => void;

const pnpm: Run = (args, env) => {
  execFileSync("pnpm", args, { env: { ...process.env, ...env }, stdio: "inherit" });
};

export async function publishPreview({ env = process.env, run = pnpm, send = fetch }:
  { env?: Env; run?: Run; send?: typeof fetch } = {}) {
  const { PREVIEW_STATUS_TOKEN: token, WORKERS_CI_BRANCH: branch, WORKERS_CI_COMMIT_SHA: sha,
    WORKERS_CI_BUILD_UUID: buildId } = env;
  if (!token || !branch || branch === "main" || !sha || !buildId) {
    throw new Error("Preview publishing requires a non-production Cloudflare build and PREVIEW_STATUS_TOKEN");
  }
  const temporary = mkdtempSync(path.join(tmpdir(), "preview-publish-"));
  try {
    const output = path.join(temporary, "wrangler.jsonl");
    run(["run", "d1:migrate:previews"], env);
    run(["exec", "wrangler", "preview", "--name", branch, "--tag", sha, "--json"], {
      ...env, WRANGLER_OUTPUT_FILE_PATH: output,
    });
    const target = parseTarget({ sha, buildId, ...deploymentFromOutput(readFileSync(output, "utf8")) });
    const response = await send(`https://api.github.com/repos/${repository}/statuses/${target.sha}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ state: "success", context: statusContext, target_url: target.baseUrl,
        description: statusDescription(target) }),
    });
    if (response.status !== 201) {
      throw new Error(`Preview deployed, but its commit status was rejected (HTTP ${response.status}); no test success was recorded`);
    }
    return target;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await publishPreview();
}
