#!/usr/bin/env node

import path from "node:path";
import { emitContext, readHookEvent, repoRoot } from "./touched-files.mjs";

const event = readHookEvent();
if (!event) {
  process.exit(0);
}
const root = repoRoot(event);

// Only a file's creation counts, so later edits to the same new file stay quiet.
function createdFiles() {
  const created = [];
  if (event.tool_name === "Write" && event.tool_response?.type === "create" && event.tool_input?.file_path) {
    created.push(event.tool_input.file_path);
  }
  const patch = JSON.stringify(event.tool_input ?? {});
  for (const match of patch.matchAll(/\*\*\* Add File: ([^\\"]+)/g)) {
    created.push(match[1]);
  }
  return created.map((file) => path.relative(root, path.isAbsolute(file) ? file : path.resolve(root, file)));
}

const created = createdFiles();
const pages = created.filter(
  (file) => /^src\/app\/\[locale\]\/.*page\.tsx$/.test(file) && !file.startsWith("src/app/[locale]/design-lab/"),
);
const routes = created.filter((file) => /^src\/app\/api\/.*route\.ts$/.test(file));
if (pages.length === 0 && routes.length === 0) {
  process.exit(0);
}

const list = (files) => files.map((file) => `- ${file}`).join("\n");
const sections = [];
if (pages.length > 0) {
  sections.push(
    "The latest edit created a public page:",
    list(pages),
    'Go through "Any user-facing feature" and "A new public page" in docs/launch-checklist.md.',
  );
}
if (routes.length > 0) {
  sections.push(
    "The latest edit created an API route:",
    list(routes),
    'Go through "A new API route" in docs/launch-checklist.md, and "Any user-facing feature" if visitors reach it.',
  );
}
sections.push("Say in the PR description which checklist items you changed and which do not apply.");

emitContext(sections.join("\n"));
