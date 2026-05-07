import { describe, it, expect } from "vitest";
import type { Lens } from "../types";
import {
  isZoom,
  filterLenses,
  sortLenses,
  getUniqueBrands,
  getLensUrl,
  getFocalCategoriesOf,
  defaultFilters,
} from "../lens";
import {
  focalEquiv,
  focalRangeDisplay,
  apertureDisplay,
} from "../lens.format";
import { lensSchema } from "../lens-schema";

// Minimal Lens factory — only fill in fields relevant to each test
function makeLens(
  overrides: Partial<Lens> & Pick<Lens, "focalLengthMin" | "focalLengthMax">
): Lens {
  return {
    id: "test-lens",
    brand: "Fujifilm",
    series: "XF",
    model: "XF35mmF1.4 R",
    maxAperture: 1.4,
    minAperture: 16,
    af: true,
    ois: false,
    wr: false,
    apertureRing: false,
    weightG: 187,
    diameterMm: 65,
    length: { mm: 45 },
    filterMm: 52,
    minFocusDistance: { cm: 28 },
    releaseYear: 2012,
    officialLinks: { global: "https://example.com/lens" },
    ...overrides,
  };
}

const prime35 = makeLens({ focalLengthMin: 35, focalLengthMax: 35 });
const zoom1835 = makeLens({ focalLengthMin: 18, focalLengthMax: 55 });

// ---------------------------------------------------------------------------
// isZoom
// ---------------------------------------------------------------------------
describe("isZoom", () => {
  it("returns false for a prime", () => {
    expect(isZoom(prime35)).toBe(false);
  });

  it("returns true for a zoom", () => {
    expect(isZoom(zoom1835)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// focalEquiv (crop factor 1.5)
// ---------------------------------------------------------------------------
describe("focalEquiv", () => {
  it("rounds correctly", () => {
    expect(focalEquiv(35)).toBe(53); // 35 * 1.5 = 52.5 → 53
    expect(focalEquiv(18)).toBe(27); // 18 * 1.5 = 27
    expect(focalEquiv(55)).toBe(83); // 55 * 1.5 = 82.5 → 83
  });
});

// ---------------------------------------------------------------------------
// focalRangeDisplay
// ---------------------------------------------------------------------------
describe("focalRangeDisplay", () => {
  it("shows single value for prime", () => {
    expect(focalRangeDisplay(35, 35)).toBe("35mm");
  });

  it("shows range for zoom", () => {
    expect(focalRangeDisplay(18, 55)).toBe("18–55mm");
  });

  it("shows equiv range for zoom", () => {
    expect(focalRangeDisplay(focalEquiv(18), focalEquiv(55))).toBe("27–83mm");
  });
});

describe("apertureDisplay", () => {
  it("shows a single aperture for primes and constant-aperture zooms", () => {
    expect(apertureDisplay(1.4)).toBe("f/1.4");
  });

  it("shows an aperture range for variable-aperture zooms", () => {
    expect(apertureDisplay([3.5, 6.3])).toBe("f/3.5–6.3");
  });

  it("shows a minimum aperture range when the zoom closes down differently", () => {
    expect(apertureDisplay([16, 22])).toBe("f/16–22");
  });
});

describe("lensSchema aperture business rules", () => {
  it("accepts matching wide and tele aperture comparisons", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 18,
        focalLengthMax: 55,
        maxAperture: [2.8, 4],
        minAperture: [16, 22],
      })
    );

    expect(result.success).toBe(true);
  });

  it("rejects a wide-end maxAperture that is greater than the wide-end minAperture", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 18,
        focalLengthMax: 55,
        maxAperture: [22, 32],
        minAperture: [16, 22],
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join(".") === "maxAperture.0")).toBe(true);
  });

  it("rejects both maxAperture values when minAperture is a single value they must not exceed", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 18,
        focalLengthMax: 55,
        maxAperture: [2.8, 22],
        minAperture: 16,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join(".") === "maxAperture.1")).toBe(true);
  });

  it("rejects a single maxAperture when minAperture has a tighter tele-end value", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 18,
        focalLengthMax: 55,
        maxAperture: 18,
        minAperture: [16, 17],
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.join(".") === "maxAperture")).toBe(true);
  });

  it("accepts a cine lens that publishes only T-stop", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 35,
        focalLengthMax: 35,
        maxAperture: undefined,
        minAperture: undefined,
        maxTStop: 2.1,
        minTStop: 16,
        specialtyTags: ["cine"],
      })
    );

    expect(result.success).toBe(true);
  });

  it("accepts a lens that publishes both f-stop and T-stop pairs", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 35,
        focalLengthMax: 35,
        maxAperture: 2.0,
        minAperture: 16,
        maxTStop: 2.1,
        minTStop: 16,
        specialtyTags: ["cine"],
      })
    );

    expect(result.success).toBe(true);
  });

  it("rejects a lens with neither aperture pair fully populated", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 35,
        focalLengthMax: 35,
        maxAperture: undefined,
        minAperture: undefined,
      })
    );

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "maxAperture" &&
          issue.message.includes("must be fully populated")
      )
    ).toBe(true);
  });

  it("rejects a lens with only one half of the f-stop pair (no T-stop)", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 35,
        focalLengthMax: 35,
        maxAperture: 1.4,
        minAperture: undefined,
      })
    );

    expect(result.success).toBe(false);
  });
});

describe("lensSchema apertureBladeCount", () => {
  it("accepts a positive integer", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 35,
        focalLengthMax: 35,
        apertureBladeCount: 9,
      })
    );

    expect(result.success).toBe(true);
  });

  it("accepts the SPEC_NA sentinel for fixed-aperture lenses", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 24,
        focalLengthMax: 24,
        apertureBladeCount: "N/A",
      })
    );

    expect(result.success).toBe(true);
  });

  it("rejects 0 (would be ambiguous with missing data)", () => {
    const result = lensSchema.safeParse(
      makeLens({
        focalLengthMin: 24,
        focalLengthMax: 24,
        apertureBladeCount: 0 as unknown as number,
      })
    );

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterLenses
// ---------------------------------------------------------------------------
const lensPool: Lens[] = [
  makeLens({
    id: "fuji-prime",
    brand: "Fujifilm",
    focalLengthMin: 35,
    focalLengthMax: 35,
    af: true,
    wr: false,
  }),
  makeLens({
    id: "fuji-zoom",
    brand: "Fujifilm",
    focalLengthMin: 18,
    focalLengthMax: 55,
    af: true,
    wr: true,
  }),
  makeLens({
    id: "sigma-prime",
    brand: "Sigma",
    focalLengthMin: 56,
    focalLengthMax: 56,
    af: true,
    wr: false,
  }),
  makeLens({
    id: "mf-prime",
    brand: "Viltrox",
    focalLengthMin: 75,
    focalLengthMax: 75,
    af: false,
    wr: false,
  }),
];

describe("filterLenses", () => {
  it("returns all lenses with default filters", () => {
    expect(filterLenses(lensPool, defaultFilters)).toHaveLength(4);
  });

  it("filters by a single brand", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      brands: ["Fujifilm"],
    });
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.brand === "Fujifilm")).toBe(true);
  });

  it("filters by multiple brands", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      brands: ["Fujifilm", "Sigma"],
    });
    expect(result).toHaveLength(3);
    expect(result.map((l) => l.id)).not.toContain("mf-prime");
  });

  it("filters by type: prime", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      typeFilter: "prime",
    });
    expect(result.every((l) => l.focalLengthMin === l.focalLengthMax)).toBe(
      true
    );
  });

  it("filters by type: zoom", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      typeFilter: "zoom",
    });
    expect(result.every((l) => l.focalLengthMin !== l.focalLengthMax)).toBe(
      true
    );
  });

  it("filters by required features (ois)", () => {
    const oisPool = [
      makeLens({
        id: "with-ois",
        focalLengthMin: 18,
        focalLengthMax: 55,
        ois: true,
      }),
      makeLens({
        id: "no-ois",
        focalLengthMin: 35,
        focalLengthMax: 35,
        ois: false,
      }),
    ];
    const result = filterLenses(oisPool, {
      ...defaultFilters,
      features: ["ois"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("with-ois");
  });

  it("filters by focusFilter=auto + wr feature", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      focusFilter: "auto",
      features: ["wr"],
    });
    expect(result.every((l) => l.af && l.wr)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fuji-zoom");
  });

  it("filters by focusFilter: auto", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      focusFilter: "auto",
    });
    expect(result.every((l) => l.af)).toBe(true);
    expect(result.map((l) => l.id)).not.toContain("mf-prime");
  });

  it("filters by focusFilter: manual", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      focusFilter: "manual",
    });
    expect(result.every((l) => !l.af)).toBe(true);
    expect(result.map((l) => l.id)).toContain("mf-prime");
  });

  it("filters by required feature: wr", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      features: ["wr"],
    });
    expect(result.every((l) => l.wr)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fuji-zoom");
  });

  it("filters by required feature: apertureRing", () => {
    const result = filterLenses(
      [
        makeLens({
          id: "with-ring",
          focalLengthMin: 35,
          focalLengthMax: 35,
          apertureRing: true,
        }),
        makeLens({
          id: "without-ring",
          focalLengthMin: 33,
          focalLengthMax: 33,
          apertureRing: false,
        }),
      ],
      {
        ...defaultFilters,
        features: ["apertureRing"],
      }
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("with-ring");
  });

  it("combines multiple filters", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      brands: ["Fujifilm"],
      typeFilter: "zoom",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fuji-zoom");
  });

  it("returns all lenses with empty focalCategories", () => {
    expect(filterLenses(lensPool, defaultFilters)).toHaveLength(4);
  });

  it("filters by focalCategory: wide", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      focalCategories: ["wide"],
    });
    // fuji-prime: 35mm -> 52.5mm equiv, does NOT overlap [24, 35)
    // fuji-zoom: 18-55mm -> 27-82.5mm equiv, DOES overlap [24, 35)
    expect(result).toHaveLength(1);
    expect(result.map((l) => l.id)).toContain("fuji-zoom");
  });

  it("filters by focalCategory: mediumTele", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      focalCategories: ["mediumTele"],
    });
    // fuji-zoom: 27-82.5 overlaps [70, 150) -> yes
    // sigma-prime: 75mm -> 112.5mm in [70, 150) -> yes
    // mf-prime: 75mm -> 112.5mm in [70, 150) -> yes
    expect(result).toHaveLength(3);
    expect(result.map((l) => l.id)).toContain("fuji-zoom");
    expect(result.map((l) => l.id)).toContain("sigma-prime");
    expect(result.map((l) => l.id)).toContain("mf-prime");
  });

  it("filters by multiple focalCategories (OR)", () => {
    const result = filterLenses(lensPool, {
      ...defaultFilters,
      focalCategories: ["wide", "standard"],
    });
    // fuji-prime: standard -> matches
    // fuji-zoom: wide+standard+mediumTele -> matches
    // sigma-prime: mediumTele -> does NOT match
    // mf-prime: mediumTele -> does NOT match
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.id)).toContain("fuji-prime");
    expect(result.map((l) => l.id)).toContain("fuji-zoom");
  });
});

// ---------------------------------------------------------------------------
// getFocalCategoriesOf
// ---------------------------------------------------------------------------
function newPrime(fl: number) {
  return { focalLengthMin: fl, focalLengthMax: fl };
}

describe("getFocalCategoriesOf", () => {
  it("classifies a 35mm prime as standard (52.5mm equiv)", () => {
    const cats = getFocalCategoriesOf(newPrime(35));
    expect(cats).toEqual(["standard"]);
  });

  it("classifies an 8mm prime as ultrawide (12mm equiv)", () => {
    const cats = getFocalCategoriesOf(newPrime(8));
    expect(cats).toEqual(["ultrawide"]);
  });

  it("classifies a 75mm prime as mediumTele (112.5mm equiv)", () => {
    const cats = getFocalCategoriesOf(newPrime(75));
    expect(cats).toEqual(["mediumTele"]);
  });

  it("classifies a 200mm prime as superTele (300mm equiv)", () => {
    const cats = getFocalCategoriesOf(newPrime(200));
    expect(cats).toEqual(["superTele"]);
  });

  it("classifies an 18-55mm zoom as wide+standard+mediumTele", () => {
    // 27-82.5mm equiv
    const cats = getFocalCategoriesOf({
      focalLengthMin: 18,
      focalLengthMax: 55,
    });
    expect(cats).toEqual(["wide", "standard", "mediumTele"]);
  });

  it("classifies a 16-300mm zoom as wide+standard+mediumTele+superTele", () => {
    // 24-450mm equiv (16mm is exactly 24mm equiv, boundary with wide)
    const cats = getFocalCategoriesOf({
      focalLengthMin: 16,
      focalLengthMax: 300,
    });
    expect(cats).toEqual([
      "wide",
      "standard",
      "mediumTele",
      "superTele",
    ]);
  });

  it("classifies an 8-16mm zoom as ultrawide+wide", () => {
    // 12-24mm equiv
    const cats = getFocalCategoriesOf({
      focalLengthMin: 8,
      focalLengthMax: 16,
    });
    expect(cats).toEqual(["ultrawide", "wide"]);
  });

  it("classifies a 50-140mm zoom as mediumTele+superTele", () => {
    // 75-210mm equiv, does not reach standard [35, 70)
    const cats = getFocalCategoriesOf({
      focalLengthMin: 50,
      focalLengthMax: 140,
    });
    expect(cats).toEqual(["mediumTele", "superTele"]);
  });
});

// ---------------------------------------------------------------------------
// sortLenses
// ---------------------------------------------------------------------------
const sortPool: Lens[] = [
  makeLens({
    id: "a",
    focalLengthMin: 56,
    focalLengthMax: 56,
    maxAperture: 1.4,
    weightG: 300,
    releaseYear: 2020,
  }),
  makeLens({
    id: "b",
    focalLengthMin: 18,
    focalLengthMax: 18,
    maxAperture: 2.8,
    weightG: 150,
    releaseYear: 2015,
  }),
  makeLens({
    id: "c",
    focalLengthMin: 35,
    focalLengthMax: 35,
    maxAperture: 2.0,
    weightG: 200,
    releaseYear: 2018,
  }),
];

describe("sortLenses", () => {
  it("sorts by focalLengthMin ascending", () => {
    const ids = sortLenses(sortPool, "focalLength", "asc").map((l) => l.id);
    expect(ids).toEqual(["b", "c", "a"]);
  });

  it("sorts by focalLengthMin descending", () => {
    const ids = sortLenses(sortPool, "focalLength", "desc").map((l) => l.id);
    expect(ids).toEqual(["a", "c", "b"]);
  });

  it("sorts by maxAperture ascending (wider aperture = smaller number = first)", () => {
    const ids = sortLenses(sortPool, "maxAperture", "asc").map((l) => l.id);
    expect(ids).toEqual(["a", "c", "b"]);
  });

  it("sorts by weightG ascending", () => {
    const ids = sortLenses(sortPool, "weightG", "asc").map((l) => l.id);
    expect(ids).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the original array", () => {
    const original = [...sortPool];
    sortLenses(sortPool, "focalLength", "asc");
    expect(sortPool).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// getUniqueBrands
// ---------------------------------------------------------------------------
describe("getUniqueBrands", () => {
  it("returns sorted unique brands", () => {
    expect(getUniqueBrands(lensPool)).toEqual(["Fujifilm", "Sigma", "Viltrox"]);
  });

  it("returns empty array for empty input", () => {
    expect(getUniqueBrands([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getLensUrl
// ---------------------------------------------------------------------------
describe("getLensUrl", () => {
  const bothLinks = { cn: "https://example.com/cn-lens", global: "https://example.com/global-lens" };

  it("returns global link for en locale", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: bothLinks });
    expect(getLensUrl(lens, "en")).toBe("https://example.com/global-lens");
  });

  it("returns cn link for zh locale", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: bothLinks });
    expect(getLensUrl(lens, "zh")).toBe("https://example.com/cn-lens");
  });

  it("returns undefined for zh locale when only global link is present (no fallback)", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: { global: "https://example.com/global-lens" } });
    expect(getLensUrl(lens, "zh")).toBeUndefined();
  });

  it("returns undefined for en locale when only cn link is present (no fallback)", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: { cn: "https://example.com/cn-lens" } });
    expect(getLensUrl(lens, "en")).toBeUndefined();
  });

  it("defaults to global when no locale is provided", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: bothLinks });
    expect(getLensUrl(lens)).toBe("https://example.com/global-lens");
  });

  it("returns undefined when no official links exist", () => {
    const lens = makeLens({
      focalLengthMin: 35,
      focalLengthMax: 35,
      officialLinks: undefined as unknown as { global: string },
    });
    expect(getLensUrl(lens, "zh")).toBeUndefined();
    expect(getLensUrl(lens, "en")).toBeUndefined();
  });
});
