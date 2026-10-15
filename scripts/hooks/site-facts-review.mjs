#!/usr/bin/env node

import { emitContext, readHookEvent, repoRoot, touchedFiles } from "./touched-files.mjs";

const event = readHookEvent();
if (!event) {
  process.exit(0);
}
const root = repoRoot(event);
const touched = touchedFiles(event, root);
if (touched.length === 0) {
  process.exit(0);
}

// Node strips the types; handwritten.ts imports only a type, so it loads without the app's aliases.
const { HANDWRITTEN_FACTS } = await import(`${root}/src/lib/site-facts/handwritten.ts`);

const stale = HANDWRITTEN_FACTS.filter((fact) =>
  (fact.sources ?? []).some((source) =>
    touched.some((file) => (source.endsWith("/") ? file.startsWith(source) : file === source)),
  ),
);
if (stale.length > 0) {
  emitContext(
    [
      "The latest edit touched code that these site facts restate (src/lib/site-facts/handwritten.ts):",
      ...stale.map((fact) => `- ${fact.id}: ${fact.text}`),
      "Check that each is still true; if not, update it and mention the change in the PR, since Iris tells these to any visitor.",
    ].join("\n"),
  );
}
