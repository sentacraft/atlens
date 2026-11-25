import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { z } from "zod";

import { formatZodIssues, lensCatalogSchema } from "../src/lib/lens/schema.ts";
import { mtfSamplesSchema, orphanedMtfSamples } from "../src/lib/lens/mtf-samples-schema.ts";

const catalogPaths = ["src/data/lenses.json", "src/data/lenses-gfx.json"];

let failed = false;
const lenses: z.infer<typeof lensCatalogSchema> = [];

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

  lenses.push(...result.data);
  console.log(`Lens catalog validation passed for ${path}`);
}

const samplesPath = resolve(process.cwd(), "src/data/mtf-samples.json");
const samples = mtfSamplesSchema.safeParse(JSON.parse(readFileSync(samplesPath, "utf8")));
if (!samples.success) {
  console.error(`MTF samples validation failed for ${samplesPath}`);
  for (const issue of formatZodIssues(samples.error)) {
    console.error(`- ${issue}`);
  }
  failed = true;
} else if (!failed) {
  const orphans = orphanedMtfSamples(samples.data, lenses);
  if (orphans.length) {
    console.error(`MTF samples name charts the catalog does not have: ${orphans.join(", ")}`);
    failed = true;
  } else {
    console.log(`MTF samples validation passed for ${samplesPath}`);
  }
}

if (failed) {
  process.exit(1);
}
