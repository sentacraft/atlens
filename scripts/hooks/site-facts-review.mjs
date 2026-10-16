#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { emitContext, readHookEvent, repoRoot, touchedFiles } from "./touched-files.mjs";

// The README and code restate how things work; the site facts and Iris's skill documents restate
// those for visitors; the About page is written from the facts. An edit at any link names what
// downstream to re-check.

const event = readHookEvent();
if (!event) {
  process.exit(0);
}
const root = repoRoot(event);
const touched = touchedFiles(event, root);
if (touched.length === 0) {
  process.exit(0);
}

// Node strips the types; these modules import only types and each other by relative path.
const { HANDWRITTEN_FACTS } = await import(`${root}/src/lib/site-facts/handwritten.ts`);
const { ABOUT_FACT_SOURCES, staleAboutCopy } = await import(`${root}/src/lib/site-facts/about-sources.ts`);
const { SKILLS } = await import(`${root}/src/lib/ai/skills/registry.ts`);

const sections = [];

const factsToRecheck = HANDWRITTEN_FACTS.filter((fact) =>
  (fact.sources ?? []).some((source) =>
    touched.some((file) => (source.endsWith("/") ? file.startsWith(source) : file === source)),
  ),
);
if (factsToRecheck.length > 0) {
  sections.push(
    "The latest edit touched code or docs that these site facts restate (src/lib/site-facts/handwritten.ts):",
    ...factsToRecheck.map((fact) => `- ${fact.id}: ${fact.text}`),
    "Check that each is still true; if not, update it and mention the change in the PR, since Iris tells these to any visitor.",
  );
}

const skillsToRecheck = Object.entries(SKILLS).filter(([, skill]) => skill.sources.some((source) => touched.includes(source)));
if (skillsToRecheck.length > 0) {
  sections.push(
    "The latest edit touched code that these Iris skill documents describe:",
    ...skillsToRecheck.map(([name]) => `- ${name} (src/lib/ai/skills/${name}.ts)`),
    "Check that the document still matches; Iris reads it to explain the site's specs to users.",
  );
}

const staleCopy = staleAboutCopy();
if (staleCopy.length > 0) {
  sections.push(
    "These About messages restate site facts that changed since the copy was last reviewed:",
    ...staleCopy.map(({ key, facts }) => `- About.${key} (cites ${facts.join(", ")})`),
    "Re-read them in src/messages/zh.json and en.json against the facts, update the copy if needed, then set each hash in src/lib/site-facts/about-sources.ts to the value the about-sources test prints.",
  );
}

function aboutAt(file, ref) {
  try {
    const text = ref ? execFileSync("git", ["show", `${ref}:${file}`], { cwd: root, encoding: "utf8" }) : readFileSync(`${root}/${file}`, "utf8");
    return JSON.parse(text).About ?? {};
  } catch {
    return null;
  }
}

const changedAbout = new Set();
for (const file of ["src/messages/zh.json", "src/messages/en.json"].filter((file) => touched.includes(file))) {
  const before = aboutAt(file, "HEAD");
  const after = aboutAt(file);
  if (!before || !after) {
    continue;
  }
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] !== after[key]) {
      changedAbout.add(key);
    }
  }
}
if (changedAbout.size > 0) {
  sections.push(
    "The latest edit changed About copy:",
    ...[...changedAbout].map((key) => `- About.${key}${ABOUT_FACT_SOURCES[key] ? ` (cites ${ABOUT_FACT_SOURCES[key].facts.join(", ")})` : ""}`),
    "The About page is written from the site facts: every claim it makes must also be in src/lib/site-facts/handwritten.ts. Add or update the fact if needed, and keep ABOUT_FACT_SOURCES in src/lib/site-facts/about-sources.ts in step — cited facts and hash — registering any new factual message.",
  );
}

if (sections.length > 0) {
  emitContext(sections.join("\n"));
}
