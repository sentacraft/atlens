import { describe, expect, it } from "vitest";
import { bodies } from "../data";
import { findBodiesByName, queryBodies } from "../query";

describe("findBodiesByName", () => {
  it("matches case, hyphen and brand-prefix variants", () => {
    const { found, notFound } = findBodiesByName(["x t5", "Fujifilm X-T30 II", "gfx100ii", "X-Z9"]);
    expect(found.map((body) => body.name)).toEqual(["X-T5", "X-T30 II", "GFX100 II"]);
    expect(notFound).toEqual(["X-Z9"]);
  });

  it("does not let X-T30 match X-T30 II", () => {
    expect(findBodiesByName(["X-T30"]).found.map((body) => body.id)).toEqual(["fujifilm-x-t30"]);
  });
});

describe("queryBodies", () => {
  it("stays on the current mount unless told otherwise", () => {
    expect(queryBodies({}, "X").matches.every((record) => record.mount === "X")).toBe(true);
    expect(queryBodies({ mount: "any" }, "X").totalMatched).toBe(bodies.length);
  });

  it("filters on IBIS stops and keeps discontinued bodies", () => {
    const { matches } = queryBodies({ ibis: true, minIbisStops: 7, mount: "any" }, "X");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((record) => record.ibis && (record.ibisStops ?? 0) >= 7)).toBe(true);
    expect(queryBodies({ discontinued: true }, "X").matches.length).toBeGreaterThan(0);
  });

  it("puts a body with no figure for a filtered field in maybe, not in matches", () => {
    const result = queryBodies({ builtInFlash: true, weatherSealed: true, mount: "any" }, "X");
    const gfx = bodies.find((body) => body.weatherSealed === undefined);
    if (gfx) {
      expect(result.matches.some((record) => record.name === `Fujifilm ${gfx.name}`)).toBe(false);
    }
    expect(result.matches.every((record) => record.builtInFlash && record.weatherSealed)).toBe(true);
  });

  it("treats null as unset", () => {
    const withNulls = queryBodies({ ibis: null, mount: null, maxWeightGrams: null }, "G");
    expect(withNulls.totalMatched).toBe(queryBodies({}, "G").totalMatched);
  });

  it("names the optional fields a record lacks", () => {
    const record = queryBodies({ names: ["X-A20"] }, "X").matches[0];
    expect(record.notInData).toEqual(expect.arrayContaining(["processor", "burstFps"]));
    expect(record.notInData).not.toContain("ibisStops");
  });

  it("reports an unknown name instead of guessing", () => {
    const result = queryBodies({ names: ["X-Z9"] }, "X");
    expect(result.matches).toEqual([]);
    expect(result.notFound).toEqual(["X-Z9"]);
  });
});
