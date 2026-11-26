import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";

let root = "";
const sha = "a".repeat(40);
const record = { version: 1, repository: "sentacraft/atlens", sha, branch: "feat/example",
  buildId: "22222222-2222-4222-8222-222222222222", deploymentId: "122c5506-1111-4111-8111-111111111111",
  baseUrl: "https://122c5506.preview.atlens.app", paths: ["/en/about", "/zh/about"],
  inputs: { lockfile: "b".repeat(64), catalog: "c".repeat(64) } };

async function setup() {
  vi.resetModules();
  root = mkdtempSync(path.join(tmpdir(), "preview-workflow-"));
  mkdirSync(path.join(root, "preview-record"));
  writeFileSync(path.join(root, "preview-record/verification.json"), JSON.stringify(record));
  writeFileSync(path.join(root, "event.json"), JSON.stringify({ client_payload: record }));
  writeFileSync(path.join(root, "output"), "");
  for (const [key, value] of Object.entries({ RUNNER_TEMP: root, GITHUB_OUTPUT: path.join(root, "output"),
    GITHUB_EVENT_PATH: path.join(root, "event.json"), GITHUB_REPOSITORY: record.repository,
    GITHUB_RUN_ID: "42", GH_TOKEN: "test-token", PREVIEW_RUN_ID: "", PREVIEW_REVISION: "" })) {
    vi.stubEnv(key, value);
  }
  const request = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", request);
  return { module: await import("../preview-workflow.mts"), request };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  if (root) {
    rmSync(root, { recursive: true, force: true });
    root = "";
  }
});

it("accepts deployment notifications before any GitHub API call", async () => {
  const { module, request } = await setup();
  vi.stubEnv("GITHUB_EVENT_NAME", "repository_dispatch");
  await module.resolveRecord();
  expect(request).not.toHaveBeenCalled();
  expect(readFileSync(path.join(root, "output"), "utf8")).toContain("download=false");
});

it("does not select a different revision from an explicitly replayed run", async () => {
  const { module, request } = await setup();
  vi.stubEnv("GITHUB_EVENT_NAME", "workflow_dispatch");
  vi.stubEnv("PREVIEW_RUN_ID", "42");
  vi.stubEnv("PREVIEW_REVISION", sha);
  request.mockResolvedValueOnce(Response.json({ artifacts: [
    { name: `preview-verification-${"b".repeat(40)}`, expired: false },
    { name: `preview-verification-${sha}`, expired: false },
  ] }));
  request.mockResolvedValueOnce(Response.json({ path: ".github/workflows/preview-validation.yml" }));
  await module.resolveRecord();
  const output = readFileSync(path.join(root, "output"), "utf8");
  expect(output).toContain(`artifact=preview-verification-${sha}`);
  expect(output).toContain("run_id=42");
});

it("resolves a saved revision without requiring an explicit run ID", async () => {
  const { module, request } = await setup();
  vi.stubEnv("GITHUB_EVENT_NAME", "workflow_dispatch");
  vi.stubEnv("PREVIEW_REVISION", sha);
  request.mockResolvedValueOnce(Response.json({ artifacts: [
    { name: `preview-verification-${sha}`, expired: false, workflow_run: { id: 77 } },
  ] }));
  request.mockResolvedValueOnce(Response.json({ path: ".github/workflows/preview-validation.yml" }));
  await module.resolveRecord();
  expect(readFileSync(path.join(root, "output"), "utf8")).toContain("run_id=77");
});

it("rejects artifacts produced by another workflow", async () => {
  const { module, request } = await setup();
  vi.stubEnv("GITHUB_EVENT_NAME", "workflow_dispatch");
  vi.stubEnv("PREVIEW_RUN_ID", "42");
  request.mockResolvedValueOnce(Response.json({ artifacts: [
    { name: `preview-verification-${sha}`, expired: false },
  ] }));
  request.mockResolvedValueOnce(Response.json({ path: ".github/workflows/e2e.yml" }));
  await expect(module.resolveRecord()).rejects.toThrow(/No saved Preview/);
});

it("opens the check on the deployed SHA rather than the dispatch's default-branch SHA", async () => {
  const { module, request } = await setup();
  request.mockResolvedValueOnce(Response.json({ commit: { sha } }));
  request.mockResolvedValueOnce(Response.json({ status: "ahead" }));
  request.mockResolvedValueOnce(Response.json({ id: 123 }));
  await module.startCheck();
  expect(JSON.parse(request.mock.calls[2][1]!.body as string).head_sha).toBe(sha);
  expect(readFileSync(path.join(root, "output"), "utf8")).toContain("check_id=123");
});

it("does not update a check belonging to another commit", async () => {
  const { module, request } = await setup();
  vi.stubEnv("PREVIEW_CHECK_ID", "123");
  request.mockResolvedValueOnce(Response.json({ head_sha: "d".repeat(40) }));
  await expect(module.finishCheck()).rejects.toThrow(/does not belong/);
  expect(request).toHaveBeenCalledTimes(1);
});

it("fails an otherwise successful check when its branch moves during testing", async () => {
  const { module, request } = await setup();
  vi.stubEnv("PREVIEW_CHECK_ID", "123");
  vi.stubEnv("PREVIEW_SMOKE_RESULT", "success");
  vi.stubEnv("PREVIEW_BROWSER_RESULT", "success");
  request.mockResolvedValueOnce(Response.json({ head_sha: sha }));
  request.mockResolvedValueOnce(Response.json({ commit: { sha: "d".repeat(40) } }));
  request.mockResolvedValueOnce(Response.json({}));
  await expect(module.finishCheck()).rejects.toThrow(/no longer match/);
  const result = JSON.parse(request.mock.calls[2][1]!.body as string);
  expect(result.conclusion).toBe("failure");
  expect(result.output.summary).toContain("current branch head");
});

it("fails an otherwise successful check when main moves during testing", async () => {
  const { module, request } = await setup();
  vi.stubEnv("PREVIEW_CHECK_ID", "123");
  vi.stubEnv("PREVIEW_SMOKE_RESULT", "success");
  vi.stubEnv("PREVIEW_BROWSER_RESULT", "success");
  request.mockResolvedValueOnce(Response.json({ head_sha: sha }));
  request.mockResolvedValueOnce(Response.json({ commit: { sha } }));
  request.mockResolvedValueOnce(Response.json({ status: "diverged" }));
  request.mockResolvedValueOnce(Response.json({}));
  await expect(module.finishCheck()).rejects.toThrow(/no longer match/);
  expect(JSON.parse(request.mock.calls[3][1]!.body as string).conclusion).toBe("failure");
});

it("completes a current revision only after both test jobs succeed", async () => {
  const { module, request } = await setup();
  vi.stubEnv("PREVIEW_CHECK_ID", "123");
  vi.stubEnv("PREVIEW_SMOKE_RESULT", "success");
  vi.stubEnv("PREVIEW_BROWSER_RESULT", "success");
  request.mockResolvedValueOnce(Response.json({ head_sha: sha }));
  request.mockResolvedValueOnce(Response.json({ commit: { sha } }));
  request.mockResolvedValueOnce(Response.json({ status: "ahead" }));
  request.mockResolvedValueOnce(Response.json({}));
  await module.finishCheck();
  expect(JSON.parse(request.mock.calls[3][1]!.body as string).conclusion).toBe("success");
});

it("cannot turn a skipped browser job into a successful check", async () => {
  const { module, request } = await setup();
  vi.stubEnv("PREVIEW_CHECK_ID", "123");
  vi.stubEnv("PREVIEW_SMOKE_RESULT", "success");
  vi.stubEnv("PREVIEW_BROWSER_RESULT", "skipped");
  request.mockResolvedValueOnce(Response.json({ head_sha: sha }));
  request.mockResolvedValueOnce(Response.json({ commit: { sha } }));
  request.mockResolvedValueOnce(Response.json({ status: "ahead" }));
  request.mockResolvedValueOnce(Response.json({}));
  await expect(module.finishCheck()).rejects.toThrow(/skipped/);
  expect(JSON.parse(request.mock.calls[3][1]!.body as string).conclusion).toBe("failure");
});
