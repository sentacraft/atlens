import { describe, it, expect } from "vitest";

import {
  aggregateFilterDimensions,
  formatFilterSnapshot,
} from "../analytics-format";

describe("formatFilterSnapshot", () => {
  it("renders optical trait (previously dropped from the label)", () => {
    const snap = JSON.stringify({ typeFilter: "prime", opticalTrait: "macro" });
    expect(formatFilterSnapshot(snap)).toBe("Prime · Trait: macro");
  });

  it("summarises a multi-dimension snapshot", () => {
    const snap = JSON.stringify({
      brands: ["sigma"],
      typeFilter: "zoom",
      focusFilter: "auto",
      usage: "photo",
      focusMotorClass: null,
      features: [],
      focalCategories: ["standard"],
    });
    expect(formatFilterSnapshot(snap)).toBe(
      "Brand: sigma · Zoom · AF · Focal: standard",
    );
  });

  it("returns (no filters) for an all-default snapshot", () => {
    const snap = JSON.stringify({ usage: "photo", brands: [], features: [] });
    expect(formatFilterSnapshot(snap)).toBe("(no filters)");
  });

  it("falls back to the raw text on invalid JSON", () => {
    expect(formatFilterSnapshot("not json")).toBe("not json");
  });
});

describe("aggregateFilterDimensions", () => {
  it("tallies each active dimension weighted by n, sorted descending", () => {
    const rows = [
      { filters: JSON.stringify({ typeFilter: "prime", focalCategories: ["standard"] }), n: 5 },
      { filters: JSON.stringify({ typeFilter: "zoom", focalCategories: ["wide"] }), n: 3 },
      { filters: JSON.stringify({ opticalTrait: "macro" }), n: 2 },
    ];
    const result = aggregateFilterDimensions(rows);
    const get = (d: string) => result.find((r) => r.dimension === d)?.n;

    expect(get("Lens type (prime/zoom)")).toBe(8);
    expect(get("Focal range")).toBe(8);
    expect(get("Optical trait")).toBe(2);
    expect(get("Brand")).toBe(0);
    // descending by count
    expect(result[0].n).toBeGreaterThanOrEqual(result[result.length - 1].n);
  });

  it("counts non-default usage as active but default usage as inactive", () => {
    const rows = [
      { filters: JSON.stringify({ usage: "photo" }), n: 4 },
      { filters: JSON.stringify({ usage: "cine" }), n: 6 },
    ];
    const usage = aggregateFilterDimensions(rows).find(
      (r) => r.dimension === "Usage (photo/cine)",
    );
    expect(usage?.n).toBe(6);
  });

  it("skips malformed rows without throwing", () => {
    const rows = [
      { filters: "broken{", n: 9 },
      { filters: JSON.stringify({ brands: ["fujifilm"] }), n: 2 },
    ];
    const brand = aggregateFilterDimensions(rows).find(
      (r) => r.dimension === "Brand",
    );
    expect(brand?.n).toBe(2);
  });

  it("coerces numeric-string n weights (AE can return them as strings)", () => {
    const rows = [{ filters: JSON.stringify({ typeFilter: "prime" }), n: "7" }];
    const type = aggregateFilterDimensions(rows).find(
      (r) => r.dimension === "Lens type (prime/zoom)",
    );
    expect(type?.n).toBe(7);
  });
});
