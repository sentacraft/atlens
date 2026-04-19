import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { formatZodIssues, lensCatalogSchema } from "../src/lib/lens-schema.ts";

const lensesPath = resolve(process.cwd(), "src/data/lenses.json");
const raw = readFileSync(lensesPath, "utf8");
const parsed = JSON.parse(raw) as unknown;

const result = lensCatalogSchema.safeParse(parsed);

if (!result.success) {
  console.error(`Lens catalog validation failed for ${lensesPath}`);
  for (const issue of formatZodIssues(result.error)) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Lens catalog validation passed for ${lensesPath}`);
