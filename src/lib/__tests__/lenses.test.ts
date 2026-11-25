import { describe, it, expect } from "vitest";
import { resolveTranslations, type Lens } from "../types";
import {
  isZoom,
  filterLenses,
  sortLenses,
  leadingValue,
  getUniqueBrands,
  getLensUrl,
  getFocalCategoriesOf,
  defaultFilters,
  classifyFocusMotor,
} from "../lens/lens";
import {
  focalEquiv,
  focalRangeDisplay,
  apertureDisplay,
  primaryApertureDisplay,
  secondaryApertureDisplay,
} from "../lens/format";
import { lensCatalogSchema, lensSchema } from "../lens/schema";

// Minimal Lens factory — only fill in fields relevant to each test
function makeLens(
  overrides: Partial<Lens> & Pick<Lens, "focalLengthMin" | "focalLengthMax">
): Lens {
  return {
    id: "test-lens",
    brand: "Fujifilm",
    mount: "X",
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
    angleOfViewCalc: 44.2,
    powerZoom: false,
    internalZoom: "N/A" as const,
    filterMm: 52,
    minFocusDistance: { normal: { cm: 28 } },
    releaseYear: 2012,
    officialLinks: { global: "https://example.com/lens" },
    searchAliases: { store: { en: "Fujifilm XF35mm F1.4 R" }, review: { en: "Fujifilm XF35mm F1.4 R" } },
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

describe("primaryApertureDisplay / secondaryApertureDisplay", () => {
  it("non-cine lens shows f-stop primary, no secondary", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35 });
    expect(primaryApertureDisplay(lens)).toBe("f/1.4");
    expect(secondaryApertureDisplay(lens)).toBeUndefined();
  });

  it("cine lens with only T-stop shows T-stop primary, no secondary", () => {
    const lens = makeLens({
      focalLengthMin: 35,
      focalLengthMax: 35,
      maxAperture: undefined,
      minAperture: undefined,
      maxTStop: 2.1,
      minTStop: 16,
      isCine: true,
    });
    expect(primaryApertureDisplay(lens)).toBe("T2.1");
    expect(secondaryApertureDisplay(lens)).toBeUndefined();
  });

  it("hybrid lens with both shows f-stop primary and T-stop secondary", () => {
    const lens = makeLens({
      focalLengthMin: 35,
      focalLengthMax: 35,
      maxAperture: 2.0,
      minAperture: 16,
      maxTStop: 2.1,
      minTStop: 16,
      isCine: true,
    });
    expect(primaryApertureDisplay(lens)).toBe("f/2");
    expect(secondaryApertureDisplay(lens)).toBe("T2.1");
  });
});

it("accepts a catalog entry without official product links", () => {
  const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: undefined });
  expect(lensCatalogSchema.safeParse([lens]).success).toBe(true);
});

describe("lensSchema movement, firmware and colorways", () => {
  it("accepts existing records without the optional fields", () => {
    const parsed = lensSchema.parse(prime35);
    for (const key of ["tiltRangeDeg", "shiftRangeMm", "firmwareUpdateMethod", "colorways"]) {
      expect(parsed).not.toHaveProperty(key);
    }
  });

  it("preserves all new fields in a catalog entry", () => {
    const fields = {
      opticalTraits: ["tilt", "shift"],
      tiltRangeDeg: [-8.5, 8.5],
      shiftRangeMm: [-15, 15],
      firmwareUpdateMethod: "usb-c",
      colorways: ["black", "silver", "black-silver"],
    };
    expect(lensCatalogSchema.parse([{ ...prime35, ...fields }])[0]).toMatchObject(fields);
  });

  for (const [field, trait] of [["tiltRangeDeg", "tilt"], ["shiftRangeMm", "shift"]] as const) {
    it.each([
      [-8.5, 8.5], [-8, 12], [0, 15], [-15, 0],
    ])(`accepts ${field} from %s to %s`, (min, max) => {
      expect(lensSchema.safeParse({
        ...prime35, opticalTraits: [trait], [field]: [min, max],
      }).success).toBe(true);
    });

    it.each([
      { range: [0, 0] }, { range: [8, -8] }, { range: [1, 8] },
      { range: [-8, -1] }, { range: [-8] }, { range: [-8, 0, 8] },
      { range: [-Infinity, 8] }, { range: [-8, Infinity] },
      { range: [NaN, 8] }, { range: ["-8", 8] }, { range: 8 },
    ])(`rejects invalid ${field}: $range`, ({ range }) => {
      const result = lensSchema.safeParse({
        ...prime35, opticalTraits: [trait], [field]: range,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path[0] === field)).toBe(true);
      }
    });

    it.each([undefined, [trait === "tilt" ? "shift" : "tilt"]])(
      `rejects ${field} without its matching trait: %s`, (opticalTraits) => {
        const result = lensSchema.safeParse({ ...prime35, opticalTraits, [field]: [-8, 8] });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(issue => issue.path[0] === field)).toBe(true);
        }
      },
    );

    it(`does not require ${field} for an existing ${trait} trait`, () => {
      expect(lensSchema.safeParse({ ...prime35, opticalTraits: [trait] }).success).toBe(true);
    });
  }

  it.each(["black", "silver", "black-silver"])("accepts a single %s colorway", (color) => {
    expect(lensSchema.safeParse({ ...prime35, colorways: [color] }).success).toBe(true);
  });

  it.each([
    { colorways: [] }, { colorways: ["black", "black"] },
    { colorways: ["gold"] }, { colorways: "black" },
  ])("rejects invalid colorways: $colorways", ({ colorways }) => {
    expect(lensSchema.safeParse({ ...prime35, colorways }).success).toBe(false);
  });

  it.each(["usb", "camera-body", "", ["usb-c"]])("rejects unknown firmware methods: %s", (method) => {
    expect(lensSchema.safeParse({ ...prime35, firmwareUpdateMethod: method }).success).toBe(false);
  });
});

describe("lensSchema classified image assets", () => {
  const mtf = {
    id: "002",
    role: "mtf",
    focalLengthMm: 35,
    spatialFrequency: { values: [10, 30], unit: "lp/mm" },
    apertureFNumbers: [1.4, 8],
    mtfMethod: "geometrical",
    depictedMount: "E",
    conditionsNote: "Source chart does not identify the mount.",
  };

  it("preserves typed assets and all source-backed conditions without inferring the lens mount", () => {
    const images = [{ id: "001", role: "product" }, mtf, { id: "003", role: "optical-construction" }];
    const parsed = lensSchema.parse({ ...prime35, images });
    expect(parsed.images).toEqual(images);
    expect(parsed.images?.[1].depictedMount).toBe("E");
    expect(parsed).not.toHaveProperty("alternateImages");
  });

  it.each(["product", "usage", "sample", "mtf", "optical-construction", "dimensions", "spec-sheet", "feature", "accessory"])("accepts the public content role %s with unknown conditions omitted", (role) => {
    const parsed = lensSchema.parse({ ...prime35, images: [{ id: "001", role }] });
    expect(parsed.images).toEqual([{ id: "001", role }]);
  });

  it.each(["white-background", "invert-on-white"])("preserves the reviewed display preset %s on technical figures", (displayPreset) => {
    const images = [{ ...mtf, displayPreset }, { id: "003", role: "optical-construction", displayPreset }];
    expect(lensSchema.parse({ ...prime35, images }).images).toEqual(images);
  });

  it.each(["invert(1)", "auto", "", null, { filter: "invert(1)" }])("rejects an unsupported display preset: %j", (displayPreset) => {
    expect(lensSchema.safeParse({ ...prime35, images: [{ ...mtf, displayPreset }] }).success).toBe(false);
  });

  it.each(["product", "usage", "sample", "dimensions", "spec-sheet", "feature", "accessory"])("rejects display presets on %s images", (role) => {
    for (const displayPreset of ["white-background", "invert-on-white"]) {
      const result = lensSchema.safeParse({ ...prime35, images: [{ id: "001", role, displayPreset }] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ["images", 0, "displayPreset"] }));
      }
    }
  });

  it("keeps display presets unchanged when resolving translated image notes", () => {
    const lens = lensSchema.parse({
      ...prime35,
      images: [{ ...mtf, displayPreset: "invert-on-white" }],
      translations: { zh: { imageNotes: { "002": "源图未注明卡口。" } } },
    });
    const translated = resolveTranslations(lens, "zh");
    expect(translated.images?.[0].displayPreset).toBe("invert-on-white");
    expect(translated.images?.[0].conditionsNote).toBe("源图未注明卡口。");
    expect(lens.images?.[0].conditionsNote).toBe(mtf.conditionsNote);
  });

  it("preserves source frequency units and actual sample settings", () => {
    const images = [
      { ...mtf, spatialFrequency: { values: [10, 20, 40], unit: "lines/mm" } },
      { id: "003", role: "sample", focalLengthMm: 42, apertureFNumbers: [5.2] },
    ];
    expect(lensSchema.parse({ ...prime35, images }).images).toEqual(images);
  });

  it("rejects multiple optical construction images at both validation entry points", () => {
    const record = {
      ...prime35,
      images: [{ id: "001", role: "optical-construction" }, { id: "002", role: "optical-construction" }],
    };
    const result = lensSchema.safeParse(record);
    expect(result.success).toBe(false);
    expect(lensCatalogSchema.safeParse([record]).success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ["images"] }));
    }
  });

  it("allows no optical diagram and keeps multiple MTF and product images", () => {
    expect(lensSchema.safeParse(prime35).success).toBe(true);
    const images = [
      { id: "001", role: "product" }, { id: "002", role: "product" },
      { id: "003", role: "mtf" }, { id: "004", role: "mtf" },
    ];
    expect(lensSchema.parse({ ...prime35, images }).images).toEqual(images);
    const withDiagram = [...images, { id: "005", role: "optical-construction" }];
    expect(lensSchema.parse({ ...prime35, images: withDiagram }).images).toEqual(withDiagram);
  });

  it.each([{ images: [] }, { images: [{ id: "001", role: "mtf" }, { id: "001", role: "product" }] }])("rejects empty lists and duplicate image IDs", ({ images }) => {
    expect(lensSchema.safeParse({ ...prime35, images }).success).toBe(false);
  });

  it.each(["1", "../001", "001.webp", "/001", "001/002", "", "abc"])("rejects unsafe or noncanonical image ID %s", (id) => {
    expect(lensSchema.safeParse({ ...prime35, images: [{ id, role: "product" }] }).success).toBe(false);
  });

  it.each(["promotion", "legend", "web-ui", "blank", "unclassified", "unknown"])("keeps archive-only role %s out of the public contract", (role) => {
    expect(lensSchema.safeParse({ ...prime35, images: [{ id: "001", role }] }).success).toBe(false);
  });

  it.each([
    { original: { path: "workspace/private.png" } }, { sha256: "a".repeat(64) },
    { sourceAssetId: "img-001" }, { review: { disposition: "selected" } },
    { preview: "private.webp" }, { title: "MTF" }, { crop: [0, 0, 10, 10] },
    { provenance: { sourceUrl: "https://example.com/private-source.png" } },
  ])("rejects private provenance and redundant fields: %j", (extra) => {
    expect(lensSchema.safeParse({ ...prime35, images: [{ id: "001", role: "mtf", ...extra }] }).success).toBe(false);
  });

  it.each([
    { focalLengthMm: 0 }, { focalLengthMm: NaN }, { focalLengthMm: Infinity },
    { apertureFNumbers: [] }, { apertureFNumbers: [1.4, 1.4] }, { apertureFNumbers: [-1] },
    { spatialFrequency: { values: [], unit: "lp/mm" } },
    { spatialFrequency: { values: [10, 10], unit: "lp/mm" } },
    { spatialFrequency: { values: ["10"], unit: "lp/mm" } },
    { spatialFrequency: { values: [10], unit: "cycles/pixel" } },
    { spatialFrequency: { values: [10], unit: "lp/mm", colors: ["red"] } },
    { mtfMethod: "measured" }, { depictedMount: "../X" }, { depictedMount: "" },
    { conditionsNote: " " }, { conditionsNote: "x".repeat(1201) },
  ])("rejects invalid image metadata: %j", (metadata) => {
    expect(lensSchema.safeParse({ ...prime35, images: [{ ...mtf, ...metadata }] }).success).toBe(false);
  });

  it.each([
    ["sourceUrl", "https://example.com/private-source.png"],
    ["conditionsSourceUrl", "https://example.com/private-conditions/"],
    ["credit", "Private creator attribution"],
    ["licenseUrl", "https://example.com/private-license/"],
  ])("rejects pipeline-private %s even when its value is otherwise valid", (field, value) => {
    const record = { ...prime35, images: [{ ...mtf, [field]: value }] };
    const result = lensSchema.safeParse(record);
    expect(result.success).toBe(false);
    expect(lensCatalogSchema.safeParse([record]).success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        code: "unrecognized_keys", path: ["images", 0], keys: [field],
      }));
    }
  });

  it.each([{ spatialFrequency: { values: [10], unit: "lp/mm" } }, { mtfMethod: "diffraction" }])("rejects MTF-only conditions on a product image: %j", (metadata) => {
    expect(lensSchema.safeParse({ ...prime35, images: [{ id: "001", role: "product", ...metadata }] }).success).toBe(false);
  });

  it.each([{ alternateImages: [] }, { alternateImages: ["001"] }])("rejects the removed image field: %j", ({ alternateImages }) => {
    for (const extra of [{}, { images: [mtf] }]) {
      const record = { ...prime35, ...extra, alternateImages };
      const result = lensSchema.safeParse(record);
      expect(result.success).toBe(false);
      expect(lensCatalogSchema.safeParse([record]).success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(expect.objectContaining({
          code: "unrecognized_keys", path: [], keys: ["alternateImages"],
        }));
      }
    }
  });

  it("resolves image notes by ID without changing numeric conditions or the original lens", () => {
    const lens = lensSchema.parse({
      ...prime35,
      images: [mtf, { id: "003", role: "accessory", conditionsNote: "Hood only." }],
      translations: { zh: { imageNotes: { "002": "源图未注明卡口。" } } },
    });
    const translated = resolveTranslations(lens, "zh");
    expect(translated.images?.[0]).toEqual({ ...mtf, conditionsNote: "源图未注明卡口。" });
    expect(translated.images?.[1].conditionsNote).toBe("Hood only.");
    expect(lens.images?.[0].conditionsNote).toBe(mtf.conditionsNote);
    expect(resolveTranslations(lens, "en")).toBe(lens);
  });

  it.each([{ "003": "Orphan note" }, { "002": " " }, {}])("rejects empty or orphan image translations: %j", (imageNotes) => {
    expect(lensSchema.safeParse({ ...prime35, images: [mtf], translations: { zh: { imageNotes } } }).success).toBe(false);
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
        isCine: true,
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
        isCine: true,
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
  return { focalLengthMin: fl, focalLengthMax: fl, mount: "X" as const };
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
      mount: "X",
    });
    expect(cats).toEqual(["wide", "standard", "mediumTele"]);
  });

  it("classifies a 16-300mm zoom as wide+standard+mediumTele+superTele", () => {
    // 24-450mm equiv (16mm is exactly 24mm equiv, boundary with wide)
    const cats = getFocalCategoriesOf({
      focalLengthMin: 16,
      focalLengthMax: 300,
      mount: "X",
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
      mount: "X",
    });
    expect(cats).toEqual(["ultrawide", "wide"]);
  });

  it("classifies a 50-140mm zoom as mediumTele+superTele", () => {
    // 75-210mm equiv, does not reach standard [35, 70)
    const cats = getFocalCategoriesOf({
      focalLengthMin: 50,
      focalLengthMax: 140,
      mount: "X",
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
    length: { mm: 50 },
    releaseYear: 2020,
  }),
  makeLens({
    id: "b",
    focalLengthMin: 18,
    focalLengthMax: 18,
    maxAperture: 2.8,
    weightG: 150,
    length: { mm: 70 },
    releaseYear: 2015,
  }),
  makeLens({
    id: "c",
    focalLengthMin: 35,
    focalLengthMax: 35,
    maxAperture: 2.0,
    weightG: 200,
    length: { mm: 40 },
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

  it("sorts by length ascending", () => {
    const ids = sortLenses(sortPool, "length", "asc").map((l) => l.id);
    expect(ids).toEqual(["c", "a", "b"]);
  });

  it("sorts by length descending", () => {
    const ids = sortLenses(sortPool, "length", "desc").map((l) => l.id);
    expect(ids).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the original array", () => {
    const original = [...sortPool];
    sortLenses(sortPool, "focalLength", "asc");
    expect(sortPool).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// leadingValue
// ---------------------------------------------------------------------------
describe("leadingValue", () => {
  it("returns a scalar unchanged", () => {
    expect(leadingValue(187)).toBe(187);
  });

  it("returns the low end of a [low, high] tuple", () => {
    expect(leadingValue([340, 395])).toBe(340);
  });

  it("passes undefined through for the caller to handle", () => {
    expect(leadingValue(undefined)).toBeUndefined();
  });

  it("does not coerce a zero scalar to undefined", () => {
    expect(leadingValue(0)).toBe(0);
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

  it("falls back to the global link for zh locale when only global link is present", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: { global: "https://example.com/global-lens" } });
    expect(getLensUrl(lens, "zh")).toBe("https://example.com/global-lens");
  });

  it("falls back to the cn link for en locale when only cn link is present", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: { cn: "https://example.com/cn-lens" } });
    expect(getLensUrl(lens, "en")).toBe("https://example.com/cn-lens");
  });

  it("defaults to global when no locale is provided", () => {
    const lens = makeLens({ focalLengthMin: 35, focalLengthMax: 35, officialLinks: bothLinks });
    expect(getLensUrl(lens)).toBe("https://example.com/global-lens");
  });

  it("returns undefined when no official links exist", () => {
    const lens = makeLens({
      focalLengthMin: 35,
      focalLengthMax: 35,
      officialLinks: undefined,
    });
    expect(getLensUrl(lens, "zh")).toBeUndefined();
    expect(getLensUrl(lens, "en")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// classifyFocusMotor
// ---------------------------------------------------------------------------
describe("classifyFocusMotor", () => {
  const af = (focusMotor: string | undefined) =>
    makeLens({ focalLengthMin: 35, focalLengthMax: 35, af: true, focusMotor });
  const mf = (focusMotor: string | undefined) =>
    makeLens({ focalLengthMin: 35, focalLengthMax: 35, af: false, focusMotor });

  it("returns undefined for MF lenses regardless of focusMotor value", () => {
    expect(classifyFocusMotor(mf("N/A"))).toBeUndefined();
    expect(classifyFocusMotor(mf(undefined))).toBeUndefined();
  });

  it("returns undefined for AF lenses with no focusMotor field (missing data, not 'other')", () => {
    expect(classifyFocusMotor(af(undefined))).toBeUndefined();
  });

  it.each([
    ["LM", "linear"],
    ["HLA", "linear"],
    ["VXD", "linear"],
    ["VCM", "linear"],
    ["Triple Linear Motor", "linear"],
    ["Quad Linear Motor", "linear"],
    ["Dual HyperVCM", "linear"],
  ])("classifies %s as linear", (motor, expected) => {
    expect(classifyFocusMotor(af(motor))).toBe(expected);
  });

  it.each([
    ["STM", "stepping"],
    ["RXD", "stepping"],
    ["Stepping Motor", "stepping"],
    ["Stepper Motor", "stepping"],
    ["STM+Lead screw", "stepping"],
  ])("classifies %s as stepping", (motor, expected) => {
    expect(classifyFocusMotor(af(motor))).toBe(expected);
  });

  it.each([
    ["DC Motor", "dc"],
    ["DC motor", "dc"],
    ["DC Coreless Motor", "dc"],
    ["High-Precision Motor", "dc"],
    ["High Precision Motor", "dc"],
  ])("classifies %s as dc", (motor, expected) => {
    expect(classifyFocusMotor(af(motor))).toBe(expected);
  });

  it("falls through to other for an AF lens with a known but unrecognised motor type", () => {
    expect(classifyFocusMotor(af("Ultrasonic Motor"))).toBe("other");
  });
});
