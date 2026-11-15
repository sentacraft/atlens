import { describe, expect, it } from "vitest";
import {
  APERTURE_FILTER_STOPS,
  WEIGHT_LIMIT_PRESETS,
  convertFocalLength,
  defaultFilters,
  filterLenses,
  type FilterState,
} from "../lens/lens";
import type { Lens } from "../types";
import { parsePositiveDecimal } from "../utils";

function makeLens(overrides: Partial<Lens> = {}): Lens {
  return {
    id: "test-lens",
    brand: "fujifilm",
    mount: "X",
    series: "XF",
    model: "Test lens",
    focalLengthMin: 35,
    focalLengthMax: 35,
    af: true,
    ois: false,
    wr: false,
    apertureRing: false,
    powerZoom: false,
    internalZoom: "N/A",
    ...overrides,
  } as Lens;
}

function matches(lens: Lens, filters: Partial<FilterState>): boolean {
  return filterLenses([lens], { ...defaultFilters, ...filters }).length === 1;
}

describe("parsePositiveDecimal", () => {
  it.each([["35", 35], ["1.4", 1.4], ["1,4", 1.4], [".5", 0.5], ["1e2", 100]] as const)(
    "parses %s", (input, expected) => expect(parsePositiveDecimal(input)).toBe(expected),
  );
  it.each([null, "", " ", " 1 ", "0", "-1", "NaN", "Infinity", "1e309", "1e-999", "0x10", "12mm", "1,2,3"])(
    "rejects %s", (input) => expect(parsePositiveDecimal(input)).toBeNull(),
  );
});

describe("browse filter contracts", () => {
  it("exports shared presets and defaults", () => {
    expect(APERTURE_FILTER_STOPS).toEqual([1.4, 2, 2.8, 3.5, 4, 5.6]);
    expect(WEIGHT_LIMIT_PRESETS).toEqual([150, 300, 500, 1000]);
    expect(defaultFilters).toMatchObject({ focalLength: null, maxAperture: null, weightLimit: null });
  });

  it.each(["X", "G"] as const)("converts without display rounding for %s", (mount) => {
    const factor = mount === "X" ? 1.5 : 0.79;
    expect(convertFocalLength(27, "actual", "equivalent", mount)).toBe(27 * factor);
    expect(convertFocalLength(40.5, "equivalent", "actual", mount)).toBe(40.5 / factor);
    expect(convertFocalLength(27, "actual", "actual", mount)).toBe(27);
    expect(convertFocalLength(27, "equivalent", "equivalent", mount)).toBe(27);
  });

  it.each([40 / 1.05, 40 * 1.05])("includes actual prime window endpoint %s", (focal) => {
    expect(matches(makeLens({ focalLengthMin: focal, focalLengthMax: focal }), {
      focalLength: { value: 40, reference: "actual" },
    })).toBe(true);
  });

  it.each([40 / 1.05 - 0.001, 40 * 1.05 + 0.001])("rejects primes outside the window %s", (focal) => {
    expect(matches(makeLens({ focalLengthMin: focal, focalLengthMax: focal }), {
      focalLength: { value: 40, reference: "actual" },
    })).toBe(false);
  });

  it("matches zoom coverage, not just a focal endpoint", () => {
    expect(matches(makeLens({ focalLengthMin: 18, focalLengthMax: 55 }), {
      focalLength: { value: 40, reference: "actual" },
    })).toBe(true);
  });

  it.each(["X", "G"] as const)("uses each lens mount and tolerates floating endpoints for %s", (mount) => {
    const factor = mount === "X" ? 1.5 : 0.79;
    const focal = 40.5 * 1.05 / factor;
    expect(matches(makeLens({ mount, focalLengthMin: focal, focalLengthMax: focal }), {
      focalLength: { value: 40.5, reference: "equivalent" },
    })).toBe(true);
    expect(matches(makeLens({ mount, focalLengthMin: 100, focalLengthMax: 100 }), {
      focalLength: { value: 40.5, reference: "equivalent" },
    })).toBe(false);
  });

  it("gives custom mode precedence even when its input is blank", () => {
    for (const value of [null, 35]) {
      expect(matches(makeLens(), {
        focalCategories: ["superTele"], focalLength: { value, reference: "actual" },
      })).toBe(true);
    }
    expect(matches(makeLens(), { focalCategories: ["superTele"] })).toBe(false);
  });

  it("filters aperture by the leading wide-end value and excludes missing values", () => {
    expect(matches(makeLens({ maxAperture: [2.8, 4] }), { maxAperture: 2.8 })).toBe(true);
    expect(matches(makeLens({ maxAperture: 4 }), { maxAperture: 2.8 })).toBe(false);
    expect(matches(makeLens(), { maxAperture: 2.8 })).toBe(false);
  });

  it("filters weight by its upper bound and excludes missing values", () => {
    expect(matches(makeLens({ weightG: [150, 300] }), { weightLimit: 300 })).toBe(true);
    expect(matches(makeLens({ weightG: [150, 301] }), { weightLimit: 300 })).toBe(false);
    expect(matches(makeLens({ weightG: 300 }), { weightLimit: 300 })).toBe(true);
    expect(matches(makeLens(), { weightLimit: 300 })).toBe(false);
  });

  it.each([0, -1, NaN, Infinity])("ignores invalid numeric constraints %s", (value) => {
    expect(matches(makeLens(), { maxAperture: value, weightLimit: value,
      focalLength: { value, reference: "actual" } })).toBe(true);
  });
});
