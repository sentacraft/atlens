import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { formatZodIssues, lensCatalogSchema } from "../src/lib/lens/schema.ts";

const catalogPaths = ["src/data/lenses.json", "src/data/lenses-gfx.json"];

let failed = false;

for (const relPath of catalogPaths) {
  const path = resolve(process.cwd(), relPath);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const result = lensCatalogSchema.safeParse(parsed);

  if (!result.success) {
    console.error(`Lens catalog validation failed for ${path}`);
    for (const issue of formatZodIssues(result.error)) {
      console.error(`- ${issue}`);
    }
    failed = true;
    continue;
  }

  console.log(`Lens catalog validation passed for ${path}`);
}

if (failed) {
  process.exit(1);
}
