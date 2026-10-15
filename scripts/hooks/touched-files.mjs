import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Reads a PostToolUse hook event from stdin; null when it is not JSON. */
export function readHookEvent() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

export function repoRoot(event) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: event.cwd || process.cwd(),
    encoding: "utf8",
  }).trim();
}

/** Repo-relative paths of the files an edit tool call wrote, from its input or patch. */
export function touchedFiles(event, root) {
  const candidates = new Set();
  function collect(value, key = "") {
    if (typeof value === "string") {
      if (key === "file_path" || key === "filePath" || key === "path") {
        candidates.add(value);
      }
      if (key === "patch") {
        for (const match of value.matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm)) {
          candidates.add(match[1]);
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        collect(item, key);
      }
      return;
    }
    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        collect(childValue, childKey);
      }
    }
  }
  collect(event);
  return [...candidates].map((candidate) =>
    path.relative(root, path.isAbsolute(candidate) ? candidate : path.resolve(root, candidate)),
  );
}

export function emitContext(additionalContext) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext } }),
  );
}
