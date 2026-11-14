import { describe, it, expect } from "vitest";

import {
  aggregateFilterDimensions,
  formatFilterSnapshot,
  topFilterSnapshots,
} from "../analytics/format";

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

  it("summarises custom focal targets and numeric limits", () => {
    expect(formatFilterSnapshot(JSON.stringify({
      focalLength: { value: 50, reference: "equivalent" },
      maxAperture: 2.8,
      weightLimit: 500,
    }))).toBe("Focal: 50mm equivalent · Max aperture: f/2.8 or faster · Weight limit: 500g");
    expect(formatFilterSnapshot(JSON.stringify({
      focalLength: { value: 33.3, reference: "actual" },
    }))).toBe("Focal: 33.3mm actual");
  });

  it.each([
    null, {}, { value: null, reference: "equivalent" },
    { value: "50", reference: "actual" }, { value: 50, reference: "unknown" },
    { value: 0, reference: "actual" }, { value: -1, reference: "actual" },
    { value: true, reference: "actual" },
  ])("ignores an inactive or malformed custom focal target: %j", (focalLength) => {
    expect(formatFilterSnapshot(JSON.stringify({ focalLength }))).toBe("(no filters)");
  });

  it.each([null, "2.8", 0, -1, true, {}, []])("ignores malformed numeric limits: %j", (value) => {
    expect(formatFilterSnapshot(JSON.stringify({ maxAperture: value, weightLimit: value }))).toBe("(no filters)");
  });

  it("ignores non-finite JSON numbers", () => {
    expect(formatFilterSnapshot('{"focalLength":{"value":1e400,"reference":"actual"},"maxAperture":1e400,"weightLimit":1e400}')).toBe("(no filters)");
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

  it("counts custom focal targets in the historical focal dimension only once", () => {
    const rows = [
      { filters: JSON.stringify({ focalCategories: ["standard"] }), n: 2 },
      { filters: JSON.stringify({ focalLength: { value: 50, reference: "equivalent" }, maxAperture: 2.8 }), n: 3 },
      { filters: JSON.stringify({ focalLength: { value: 35, reference: "actual" }, focalCategories: ["wide"], weightLimit: 500 }), n: 4 },
      { filters: JSON.stringify({ focalLength: { value: null, reference: "actual" }, maxAperture: "2.8", weightLimit: 0 }), n: 20 },
      { filters: JSON.stringify({ focalLength: { value: 50, reference: "unknown" }, maxAperture: -1, weightLimit: "500" }), n: 20 },
      { filters: '{"focalLength":{"value":1e400,"reference":"actual"},"maxAperture":1e400,"weightLimit":1e400}', n: 20 },
    ];
    const result = aggregateFilterDimensions(rows);
    expect(result.filter((row) => /focal/i.test(row.dimension))).toEqual([{ dimension: "Focal range", n: 9 }]);
    expect(result.find((row) => row.dimension === "Max aperture")?.n).toBe(3);
    expect(result.find((row) => row.dimension === "Weight limit")?.n).toBe(4);
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

describe("topFilterSnapshots", () => {
  it("merges snapshots that show the same filters, whatever their recorded shape", () => {
    const rows = [
      { filters_json: JSON.stringify({ brands: ["sigma"], typeFilter: null, usage: "photo", sort: "focalLength" }), n: 3 },
      { filters_json: JSON.stringify({ brands: ["sigma"] }), n: 2 },
      { filters_json: JSON.stringify({ brands: ["sigma"], sort: "weightG" }), n: 1 },
      { filters_json: JSON.stringify({ typeFilter: "zoom" }), n: 4 },
    ];

    expect(topFilterSnapshots(rows, 10)).toEqual([
      { display: "Brand: sigma", filters_json: rows[0].filters_json, n: 6 },
      { display: "Zoom", filters_json: rows[3].filters_json, n: 4 },
    ]);
  });

  it("keeps distinct focal targets, references and thresholds separate", () => {
    const snapshots = [
      { focalLength: { value: 50, reference: "equivalent" } },
      { focalLength: { value: 51, reference: "equivalent" } },
      { focalLength: { value: 50, reference: "actual" } },
      { maxAperture: 2.8 },
      { maxAperture: 2.9 },
      { weightLimit: 500 },
      { weightLimit: 501 },
    ];
    const rows = snapshots.map((snapshot, index) => ({ filters_json: JSON.stringify(snapshot), n: index + 1 }));
    const result = topFilterSnapshots(rows, 20);
    expect(result).toHaveLength(rows.length);
    expect(new Set(result.map((row) => row.display)).size).toBe(rows.length);
    expect(result.map((row) => row.n)).toEqual([7, 6, 5, 4, 3, 2, 1]);
  });

  it("keeps only the top rows", () => {
    const rows = [
      { filters_json: JSON.stringify({ typeFilter: "zoom" }), n: 1 },
      { filters_json: JSON.stringify({ typeFilter: "prime" }), n: 5 },
    ];

    expect(topFilterSnapshots(rows, 1).map((r) => r.display)).toEqual(["Prime"]);
  });
});
