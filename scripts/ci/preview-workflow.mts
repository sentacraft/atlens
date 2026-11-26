import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inputHashes, parseVerification, readVerification, repository, type Verification } from "./preview-contract.mts";

interface Artifact { name: string; expired: boolean; workflow_run?: { id: number } }
const workflowPath = ".github/workflows/preview-validation.yml";
const recordFile = path.join(process.env.RUNNER_TEMP ?? ".", "preview-record", "verification.json");

export async function github<T>(endpoint: string, method = "GET", body?: unknown): Promise<T> {
  if (!process.env.GH_TOKEN || process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== repository) {
    throw new Error("GH_TOKEN is required for verification orchestration");
  }
  const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
    method, redirect: "error", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(`GitHub ${method} ${endpoint.split("?")[0]} returned HTTP ${response.status}`);
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

function output(name: string, value: string) {
  if (!process.env.GITHUB_OUTPUT || /[\r\n]/.test(value)) {
    throw new Error("Invalid workflow output");
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

export async function assertCurrent(record: Verification) {
  const branch = await github<{ commit: { sha: string } }>(`/branches/${encodeURIComponent(record.branch)}`);
  if (branch.commit.sha !== record.sha) {
    throw new Error("Preview is not the current branch head; wait for its new deployment");
  }
  const comparison = await github<{ status: string }>(`/compare/main...${record.sha}`);
  if (!["ahead", "identical"].includes(comparison.status)) {
    throw new Error("Update the task branch from current main before accepting Preview verification");
  }
}

export async function resolveRecord() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf8"));
  if (process.env.GITHUB_EVENT_NAME === "repository_dispatch") {
    const record = parseVerification(event.client_payload);
    mkdirSync(path.dirname(recordFile), { recursive: true });
    writeFileSync(recordFile, JSON.stringify(record) + "\n", { mode: 0o600 });
    output("download", "false");
    return;
  }
  const runId = process.env.PREVIEW_RUN_ID;
  const revision = process.env.PREVIEW_REVISION;
  if (runId && !/^[1-9]\d*$/.test(runId) || revision && !/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error("Invalid verification run or revision");
  }
  const query = revision ? `&name=preview-verification-${revision}` : "";
  const result = await github<{ artifacts: Artifact[] }>(runId ? `/actions/runs/${runId}/artifacts?per_page=100` : `/actions/artifacts?per_page=100${query}`);
  for (const artifact of result.artifacts) {
    if (artifact.expired || !/^preview-verification-[a-f0-9]{40}$/.test(artifact.name) ||
        revision && artifact.name !== `preview-verification-${revision}`) {
      continue;
    }
    const sourceRun = runId || artifact.workflow_run?.id;
    if (!sourceRun) {
      continue;
    }
    const run = await github<{ path: string }>(`/actions/runs/${sourceRun}`);
    if (run.path !== workflowPath) {
      continue;
    }
    output("download", "true");
    output("artifact", artifact.name);
    output("run_id", String(sourceRun));
    return;
  }
  throw new Error("No saved Preview verification target; deploy on Cloudflare first, never build in this test workflow");
}

export async function startCheck() {
  const record = readVerification(recordFile);
  await assertCurrent(record);
  const check = await github<{ id: number }>("/check-runs", "POST", {
    name: "Cloudflare Preview validation", head_sha: record.sha, status: "in_progress",
    external_id: `${record.buildId}:${process.env.GITHUB_RUN_ID}`,
    details_url: `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    output: { title: "Testing an existing Cloudflare deployment", summary: `Build ${record.buildId}; deployment ${record.deploymentId}` },
  });
  output("sha", record.sha);
  output("check_id", String(check.id));
}

export async function finishCheck() {
  const record = readVerification(recordFile);
  const id = process.env.PREVIEW_CHECK_ID;
  if (!id || !/^[1-9]\d*$/.test(id)) {
    throw new Error("Missing verification check ID");
  }
  const check = await github<{ head_sha: string }>(`/check-runs/${id}`);
  if (check.head_sha !== record.sha) {
    throw new Error("Check run does not belong to the tested revision");
  }
  let success = process.env.PREVIEW_SMOKE_RESULT === "success" && process.env.PREVIEW_BROWSER_RESULT === "success";
  let summary = `Smoke: ${process.env.PREVIEW_SMOKE_RESULT}; browsers: ${process.env.PREVIEW_BROWSER_RESULT}. Build ${record.buildId}; deployment ${record.deploymentId}.`;
  try {
    await assertCurrent(record);
  } catch (error) {
    success = false;
    summary += ` ${error instanceof Error ? error.message : "Version validation failed"}`;
  }
  await github(`/check-runs/${id}`, "PATCH", {
    status: "completed", conclusion: success ? "success" : "failure",
    output: { title: success ? "Cloudflare Preview verified" : "Cloudflare Preview verification failed", summary },
  });
  if (!success) {
    throw new Error("Preview checks failed, were skipped, or no longer match current code");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === "resolve") {
    await resolveRecord();
  } else if (command === "start") {
    await startCheck();
  } else if (command === "inputs") {
    const record = readVerification(process.env.PREVIEW_VERIFICATION_FILE!);
    const inputs = inputHashes(readFileSync("pnpm-lock.yaml"), readFileSync("src/data/catalog-source.json"));
    if (record.inputs.lockfile !== inputs.lockfile || record.inputs.catalog !== inputs.catalog) {
      throw new Error("Test inputs differ from the deployed build");
    }
  } else if (command === "finish") {
    await finishCheck();
  } else {
    throw new Error("Usage: preview-workflow.mts resolve|start|inputs|finish");
  }
}
