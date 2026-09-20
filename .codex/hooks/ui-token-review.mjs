#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const input = readFileSync(0, "utf8");

let event;
try {
  event = JSON.parse(input);
} catch {
  process.exit(0);
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: event.cwd || process.cwd(),
  encoding: "utf8",
}).trim();

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

function relativePath(candidate) {
  const absolute = path.isAbsolute(candidate) ? candidate : path.resolve(root, candidate);
  return path.relative(root, absolute);
}

function isUiFile(relative) {
  if (relative.startsWith("src/components/") && relative.endsWith(".tsx")) {
    return true;
  }
  if (relative.startsWith("src/app/") && relative.endsWith(".tsx")) {
    return true;
  }
  if (!relative.startsWith("src/components/") || !relative.endsWith(".ts")) {
    return false;
  }

  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) {
    return false;
  }
  const source = readFileSync(absolute, "utf8");
  return /\bclassName\b|(?:^|\s)(?:[a-z-]+:)?(?:rounded|text|bg|border|shadow|ring|transition|hover|focus)-/.test(source);
}

const uiFiles = [...candidates].map(relativePath).filter(isUiFile);
if (uiFiles.length === 0) {
  process.exit(0);
}

const fileList = uiFiles.map((file) => `- ${file}`).join("\n");
const additionalContext = [
  "The latest edit touched UI files:",
  fileList,
  "Review src/config/ui-tokens.ts and decide whether to reuse an existing UI token or extract a reusable interaction style into a token. One-off layout styles may remain local to the component.",
].join("\n");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext,
    },
  }),
);
