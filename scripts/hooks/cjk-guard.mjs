#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { emitContext, readHookEvent, repoRoot, touchedFiles } from "./touched-files.mjs";

// The only places Chinese text belongs. A path ending in "/" covers everything under it.
const ALLOWED = [
  "src/messages/zh.json", // UI copy
  "src/lib/ai/system-prompt.ts", // every model-facing Chinese sentence
  "src/data/", // lens and collection data
  "src/lib/types.ts", // Lens JSDoc examples, the data pipeline's extraction spec
  "src/lib/purchase/links.ts", // JD and Taobao store names on the Chinese site
  "src/components/seo/SiteJsonLd.tsx", // the site's Chinese alternate names for search engines
  "eval/", // Chinese test turns
  "e2e/", // Chinese UI assertions
  "README.md", // bilingual readme
];
const ALLOWED_DIRS = ["__tests__/"];

const CJK = /[　-〿㐀-鿿＀-￯]/;

const event = readHookEvent();
if (!event) {
  process.exit(0);
}
const root = repoRoot(event);

const allowed = (file) =>
  ALLOWED.some((entry) => (entry.endsWith("/") ? file.startsWith(entry) : file === entry)) ||
  ALLOWED_DIRS.some((dir) => file.includes(`/${dir}`));

const offending = [];
for (const file of touchedFiles(event, root)) {
  const absolute = path.join(root, file);
  if (file.startsWith("..") || allowed(file) || !existsSync(absolute)) {
    continue;
  }
  const lines = readFileSync(absolute, "utf8").split("\n");
  const hits = lines.flatMap((line, i) => (CJK.test(line) ? [`  ${file}:${i + 1}: ${line.trim().slice(0, 120)}`] : []));
  if (hits.length > 0) {
    offending.push(...hits);
  }
}

if (offending.length > 0) {
  emitContext(
    [
      "The latest edit put Chinese text in a file where it does not belong:",
      ...offending,
      "Move UI copy to src/messages/zh.json and model-facing wording to src/lib/ai/system-prompt.ts; write comments in English. If this file genuinely needs Chinese, add it to ALLOWED in scripts/hooks/cjk-guard.mjs with the reason.",
    ].join("\n"),
  );
}
