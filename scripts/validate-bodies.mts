import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { formatZodIssues } from "../src/lib/lens/schema.ts";
import { bodyCatalogJsonSchema, bodyCatalogSchema } from "../src/lib/body/schema.ts";

const dataPath = resolve(process.cwd(), "src/data/bodies.json");
const schemaPath = resolve(process.cwd(), "src/data/bodies.schema.json");
const write = process.argv.includes("--write");

const expectedSchema = `${JSON.stringify(bodyCatalogJsonSchema(), null, 2)}\n`;
if (write) {
  writeFileSync(schemaPath, expectedSchema);
  console.log(`Wrote ${schemaPath}`);
} else if (readFileSync(schemaPath, "utf8") !== expectedSchema) {
  console.error(`${schemaPath} is out of date. Run: node --experimental-strip-types scripts/validate-bodies.mts --write`);
  process.exit(1);
}

const result = bodyCatalogSchema.safeParse(JSON.parse(readFileSync(dataPath, "utf8")) as unknown);
if (!result.success) {
  console.error(`Body catalog validation failed for ${dataPath}`);
  for (const issue of formatZodIssues(result.error)) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}
console.log(`Body catalog validation passed for ${dataPath}`);
