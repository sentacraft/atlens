import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildLensTools } from "../tools";

// Google's function declarations accept an OpenAPI-3.0 subset, not full JSON Schema, and
// reject the request outright rather than degrading — a `z.tuple()` in one parameter took
// every Gemini model off the table until it was found. These are the constructs Zod emits
// that that subset has no room for, checked on the shape actually sent to the provider.
const tools = buildLensTools("X", "zh", (brand) => brand);

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
  if (schema.anyOf || schema.oneOf) {
    found.push(`${path}: anyOf/oneOf (often a .nullable(); make it .optional() instead)`);
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
