import { describe, it, expect } from "vitest";
import { buildLensTools } from "../tools";

const tools = buildLensTools("X", "zh", (brand) => brand);

// The AI SDK types `execute` as optional and passes call options every tool here ignores.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (tool: { execute?: (...args: any[]) => any }, input: unknown) =>
  tool.execute!(input, {} as never);

// Walk a tool payload for the raw catalogue id. Ids are patterned (brand-model slugs), so
// one in context is enough for a model to guess others and cite a lens it never recalled —
// which is the whole reason refs exist.
function idsIn(node: unknown, path: string, found: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => idsIn(item, `${path}[${i}]`, found));
    return;
  }
  if (!node || typeof node !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "id") {
      found.push(`${path}.id = ${String(value)}`);
    }
    idsIn(value, `${path}.${key}`, found);
  }
}

describe("lensDetails hands the model refs, never ids", () => {
  it("returns a ref per lens and no id anywhere in the payload", async () => {
    // lensDetails only resolves refs the same turn already recalled, so seed the gate.
    const recall = await run(tools.queryLenses, { type: "prime" });
    const refs = recall.matches.slice(0, 3).map((lens: { ref: string }) => lens.ref);
    expect(refs.length).toBeGreaterThan(0);

    const details = await run(tools.lensDetails, { refs });

    expect(details.lenses.map((lens: { ref?: string }) => lens.ref)).toEqual(refs);

    const found: string[] = [];
    idsIn(details, "lensDetails", found);
    expect(found).toEqual([]);
  });

  it("still carries the long-tail specs a recall result leaves out", async () => {
    const recall = await run(tools.queryLenses, { type: "prime" });
    const [ref] = recall.matches.map((lens: { ref: string }) => lens.ref);
    const details = await run(tools.lensDetails, { refs: [ref] });

    // Dropping the id must not turn into dropping the payload: these are exactly what
    // the tool exists to fetch, and none of them appears in a recall result.
    expect(Object.keys(details.lenses[0])).toEqual(
      expect.arrayContaining([
        "lensConfiguration",
        "filterMm",
        "apertureBladeCount",
        "focusMotor",
        "internalFocusing",
      ]),
    );
  });
});
