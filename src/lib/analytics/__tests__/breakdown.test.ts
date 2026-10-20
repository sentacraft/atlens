import { describe, expect, it } from "vitest";
import { buildBreakdown } from "../breakdown";

const label = (level: string, value: string | null) => `${level}:${value ?? "none"}`;

describe("buildBreakdown", () => {
  it("nests rows by level, largest group first, with groups that add up to their parent", () => {
    const nodes = buildBreakdown(
      [
        { entry: "home", pool: "need", n: 2 },
        { entry: "home", pool: null, n: 3 },
        { entry: "lens", pool: null, n: 6 },
      ],
      ["entry", "pool"],
      label,
    );

    expect(nodes.map((node) => [node.label, node.count])).toEqual([
      ["entry:lens", 6],
      ["entry:home", 5],
    ]);
    expect(nodes[1].children.map((node) => [node.label, node.count])).toEqual([
      ["pool:none", 3],
      ["pool:need", 2],
    ]);
  });

  it("leaves out a level that splits nothing", () => {
    const [node] = buildBreakdown([{ method: "typed", pool: null, n: 4 }], ["method", "pool"], label);

    expect(node.children).toEqual([]);
  });

  it("puts what the rows do not cover into a missing group", () => {
    const nodes = buildBreakdown([{ entry: "home", n: 2 }], ["entry"], label, 5);

    expect(nodes.map((node) => [node.value, node.count])).toEqual([
      [null, 3],
      ["home", 2],
    ]);
  });
});
