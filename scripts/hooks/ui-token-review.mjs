#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { emitContext, readHookEvent, repoRoot, touchedFiles } from "./touched-files.mjs";

const event = readHookEvent();
if (!event) {
  process.exit(0);
}
const root = repoRoot(event);

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

// Files the design system artifact mirrors; keep in sync with its component list.
const DESIGN_SYSTEM_URL = "https://claude.ai/artifact/4HmVRpfNHU5zsrhynoCceH";
const DESIGN_SOURCES = new Set([
  "src/app/theme.css",
  "src/app/globals.css",
  "src/app/fonts.ts",
  "src/config/ui-tokens.ts",
  "src/components/ui/button.tsx",
  "src/components/ui/checkbox.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/select.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/auth/AuthControl.tsx",
  "src/components/lens/LensCard.tsx",
  "src/components/askiris/AskIrisComposer.tsx",
  "src/components/askiris/AskIrisThread.tsx",
  "src/components/askiris/ConversationHistory.tsx",
]);

const touched = touchedFiles(event, root);
const uiFiles = touched.filter(isUiFile);
const designFiles = touched.filter((file) => DESIGN_SOURCES.has(file));
if (uiFiles.length === 0 && designFiles.length === 0) {
  process.exit(0);
}

const list = (files) => files.map((file) => `- ${file}`).join("\n");
const sections = [];
if (uiFiles.length > 0) {
  sections.push(
    "The latest edit touched UI files:",
    list(uiFiles),
    "Review src/config/ui-tokens.ts and decide whether to reuse an existing UI token or extract a reusable interaction style into a token. One-off layout styles may remain local to the component.",
  );
}
if (designFiles.length > 0) {
  sections.push(
    "The latest edit touched files the design system mirrors:",
    list(designFiles),
    `If the change alters colors, type, spacing, radii, shadows or a mirrored component's look, re-sync the design system (${DESIGN_SYSTEM_URL}): update only the affected tokens or component files there, and mention it in the PR.`,
  );
}
const additionalContext = sections.join("\n");

emitContext(additionalContext);
