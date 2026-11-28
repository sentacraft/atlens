import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deploymentFromOutput, parseTarget, repository, statusContext, statusDescription } from "./preview-target.mts";

type Env = Record<string, string | undefined>;
type Run = (args: string[], env: Env) => void;

const pnpm: Run = (args, env) => {
  execFileSync("pnpm", args, { env: { ...process.env, ...env }, stdio: "inherit" });
};

/**
 * Preserves Workers Builds' `WRANGLER_OUTPUT_FILE_*` env vars so Cloudflare's build runner
 * still receives the Preview record (`preview_urls` / `deployment_urls`) for its PR comment.
 */
function deployAndReadOutput(run: Run, args: string[], env: Env): string {
  const configuredPath = env.WRANGLER_OUTPUT_FILE_PATH;
  if (configuredPath) {
    const startOffset = existsSync(configuredPath) ? statSync(configuredPath).size : 0;
    run(args, env);
    return existsSync(configuredPath) ? readFileSync(configuredPath).subarray(startOffset).toString("utf8") : "";
  }

  const configuredDir = env.WRANGLER_OUTPUT_FILE_DIRECTORY;
  if (configuredDir) {
    const before = existsSync(configuredDir) ? new Set(readdirSync(configuredDir)) : new Set<string>();
    run(args, env);
    if (!existsSync(configuredDir)) {
      return "";
    }
    return readdirSync(configuredDir)
      .filter((name) => !before.has(name))
      .sort()
      .map((name) => readFileSync(path.join(configuredDir, name), "utf8"))
      .join("\n");
  }

  const temporary = mkdtempSync(path.join(tmpdir(), "preview-publish-"));
  const output = path.join(temporary, "wrangler.jsonl");
  try {
    run(args, { ...env, WRANGLER_OUTPUT_FILE_PATH: output });
    return existsSync(output) ? readFileSync(output, "utf8") : "";
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export async function publishPreview({ env = process.env, run = pnpm, send = fetch }:
  { env?: Env; run?: Run; send?: typeof fetch } = {}) {
  const { PREVIEW_STATUS_TOKEN: token, WORKERS_CI_BRANCH: branch, WORKERS_CI_COMMIT_SHA: sha,
    WORKERS_CI_BUILD_UUID: buildId } = env;
  if (!token || !branch || branch === "main" || !sha || !buildId) {
    throw new Error("Preview publishing requires a non-production Cloudflare build and PREVIEW_STATUS_TOKEN");
  }
  run(["run", "d1:migrate:previews"], env);
  const output = deployAndReadOutput(run, ["exec", "wrangler", "preview", "--name", branch, "--tag", sha], env);
  const target = parseTarget({ sha, buildId, ...deploymentFromOutput(output) });
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
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await publishPreview();
}
