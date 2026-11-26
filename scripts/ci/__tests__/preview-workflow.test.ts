import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { statusContext } from "../preview-target.mts";

const root = path.resolve(import.meta.dirname, "../../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const receiver = read(".github/workflows/preview-smoke.yml");
const filter = `github.event.context == '${statusContext}' && github.event.state == 'success'`;

function job(name: string): string {
  const start = receiver.indexOf(`\n  ${name}:\n`);
  const next = receiver.slice(start + 1).search(/\n {2}[a-z]+:\n/);
  return receiver.slice(start, next === -1 ? undefined : start + 1 + next);
}

/** The shell of every block-style `run:` step, dedented. */
function scripts(yaml: string): string[] {
  return [...yaml.matchAll(/^( +)run: \|\n((?:\1 {2}.*\n|\n)+)/gm)]
    .map(([, indent, body]) => body.replace(new RegExp(`^${indent} {2}`, "gm"), ""));
}

const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Runs a step the way the runner does, with a `gh` that answers the branch-head lookup. */
function runStep(script: string, env: Record<string, string>, heads: string) {
  const directory = mkdtempSync(path.join(tmpdir(), "preview-step-"));
  temporary.push(directory);
  const gh = path.join(directory, "gh");
  const created = path.join(directory, "check-run");
  writeFileSync(gh, `#!/bin/sh
case "$2" in
  */branches-where-head) [ "$HEADS" = error ] && exit 1; echo "$HEADS" ;;
  */check-runs) printf '%s\\n' "$@" > "$CREATED" ;;
  *) exit 1 ;;
esac
`);
  chmodSync(gh, 0o755);
  const result = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", script], {
    env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, GITHUB_REPOSITORY: "example/repo",
      SHA: "a".repeat(40), HEADS: heads, CREATED: created, ...env },
  });
  return { status: result.status, checkRun: existsSync(created) ? readFileSync(created, "utf8").split("\n") : [] };
}

describe("Preview smoke workflow", () => {
  it("runs only for the successful deployment status", () => {
    expect(receiver).toMatch(/^on:\n {2}status:\n\n/m);
    expect(job("target")).toContain(`if: ${filter}`);
    expect(job("report")).toContain(`if: \${{ always() && ${filter} }}`);
  });

  it("keeps unrelated statuses from cancelling a queued probe", () => {
    expect(receiver).toContain("group: preview-smoke-${{ github.event.sha }}-${{ github.event.context }}-${{ github.event.state }}");
  });

  it("never expands an expression inside a shell script", () => {
    const blocks = scripts(receiver);
    expect(blocks).toHaveLength(2);
    for (const block of blocks) {
      expect(block).not.toContain("${{");
    }
    for (const [, inline] of receiver.matchAll(/^ +run: (?!\|)(.*)$/gm)) {
      expect(inline).not.toContain("${{");
    }
  });

  it("never builds the app", () => {
    expect(receiver).not.toMatch(/next build|next start|wrangler dev|opennextjs-cloudflare|pnpm/);
  });

  it("checks the branch head before running the commit's scripts", () => {
    const [guard] = scripts(job("target"));
    expect(runStep(guard, {}, "1").status).toBe(0);
    expect(runStep(guard, {}, "0").status).not.toBe(0);
    expect(runStep(guard, {}, "error").status).not.toBe(0);
    expect(job("smoke")).toContain("needs: target");
  });

  it.each([
    ["a passing probe of a branch head", "success", "1", "success"],
    ["a branch that moved during the probe", "success", "0", "failure"],
    ["a failed branch lookup", "success", "error", "failure"],
    ["a failed probe", "failure", "1", "failure"],
    ["a probe that never ran", "skipped", "1", "failure"],
    ["a cancelled probe", "cancelled", "1", "failure"],
  ])("creates a completed check run for %s", (_name, smoke, heads, conclusion) => {
    const [report] = scripts(job("report"));
    const result = runStep(report, { SMOKE_RESULT: smoke, TARGET_RESULT: "success" }, heads);
    expect(result.status).toBe(0);
    expect(result.checkRun).toContain("name=Cloudflare Preview smoke");
    expect(result.checkRun).toContain(`head_sha=${"a".repeat(40)}`);
    expect(result.checkRun).toContain("status=completed");
    expect(result.checkRun).toContain(`conclusion=${conclusion}`);
  });

  it("reports with no checkout or artifact that could fail first", () => {
    expect(job("report")).not.toMatch(/^\s*(- )?uses:/m);
    expect(job("report")).toContain("checks: write");
  });

  it("leaves the Cloudflare build command unchanged until the Preview command is switched", () => {
    const { scripts: commands } = JSON.parse(read("package.json"));
    expect(commands["prebuild:cf"]).toBeUndefined();
    expect(commands["postbuild:cf"]).toBeUndefined();
  });

  it("switches off only the local workerd smoke job", () => {
    expect(read(".github/workflows/cf-smoke.yml")).toContain("if: vars.CF_PREVIEW_VALIDATION != 'true'");
    for (const name of ["e2e", "text-fit-check"]) {
      expect(read(`.github/workflows/${name}.yml`)).not.toContain("CF_PREVIEW_VALIDATION");
    }
  });
});
