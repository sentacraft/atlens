import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildLensTools, type AccountData } from "../tools";

const GUEST: AccountData = { favorites: async () => null, gear: { known: false, reason: "guest" } };

// Google's function declarations accept an OpenAPI-3.0 subset, not full JSON Schema, and
// reject the request outright rather than degrading — a `z.tuple()` in one parameter took
// every Gemini model off the table until it was found. These are the constructs Zod emits
// that that subset has no room for, checked on the shape actually sent to the provider.
const tools = buildLensTools("X", "zh", (brand) => brand, GUEST, new Set());

function findUnportable(node: unknown, path: string, found: string[]): void {
  if (!node || typeof node !== "object") {
    return;
  }
  const schema = node as Record<string, unknown>;
  if (schema.prefixItems) {
    found.push(`${path}: prefixItems (a tuple; use an object with named bounds)`);
  }
  if (schema.type === "array" && !schema.items) {
    found.push(`${path}: array without items`);
  }
  // A nullable field (anyOf: [T, null]) is allowed: strict-mode callers such as GPT need null
  // to leave a field unset. Gemini now receives `parametersJsonSchema`, which should accept it,
  // but that is unverified; check it before switching Iris to a Gemini model.
  const variants = (schema.anyOf ?? schema.oneOf) as Record<string, unknown>[] | undefined;
  const isNullable = variants?.length === 2 && variants.some((variant) => variant.type === "null");
  if (variants && !isNullable) {
    found.push(`${path}: anyOf/oneOf beyond a nullable field`);
  }
  for (const variant of isNullable ? variants : []) {
    findUnportable(variant, path, found);
  }
  for (const key of ["properties", "$defs"]) {
    const group = schema[key] as Record<string, unknown> | undefined;
    for (const [name, child] of Object.entries(group ?? {})) {
      findUnportable(child, path ? `${path}.${name}` : name, found);
    }
  }
  if (schema.items) {
    findUnportable(schema.items, `${path}[]`, found);
  }
}

describe("tool schemas stay portable across providers", () => {
  for (const [name, tool] of Object.entries(tools)) {
    it(`${name} emits no construct Google's function declarations reject`, () => {
      const found: string[] = [];
      // inputSchema is typed as the SDK's FlexibleSchema; every tool here passes a Zod
      // object, which is what toJSONSchema needs.
      findUnportable(z.toJSONSchema(tool.inputSchema as z.ZodType), "", found);
      expect(found).toEqual([]);
    });
  }
});

describe("queryLenses input", () => {
  it("lets a caller leave a constraint unset with null", () => {
    // GPT models fill every field; with no null allowed they sent 0, and maxWide: 0 matched nothing.
    const schema = tools.queryLenses.inputSchema as z.ZodType;
    expect(
      schema.safeParse({ queries: [{ type: "prime", maxWide: null, maxWeightG: null, focalWithin: { min: null, max: 18 } }] })
        .success,
    ).toBe(true);
  });
});
