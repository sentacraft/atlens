import { describe, it, expect } from "vitest";
import type { LensConfiguration, LensLength, MaxMagnification } from "../types";
import { SPEC_NA } from "../types";
import {
  oisDisplay,
  tStopDisplay,
  optionalNumber,
  weightDisplay,
  wrDisplay,
  filterSizeDisplay,
  angleOfViewDisplay,
  magnificationDisplay,
  dimensionsRichDisplay,
  maxMagnificationRichDisplay,
  dimensionsPrimaryDisplay,
  dimensionsVariantsDisplay,
  mfdHeroValue,
  mfdHeroQualifier,
  mfdStructuredLines,
  mfdComparable,
  maxMagnificationPrimaryDisplay,
  maxMagnificationSecondaryDisplay,
  lensConfigurationPrimaryDisplay,
  lensConfigurationSecondaryDisplay,
  lensConfigurationDisplay,
} from "../lens/format";

const oisLabels = { yes: "Yes", no: "No" };
const wrLabels = { yes: "Yes", no: "No", partial: "Partial" };
const wideTeLabels = { wide: "Wide", tele: "Tele" };
const variantLabels = { retracted: "Retracted", wide: "Wide", tele: "Tele" };

const configLabels = {
  groups: "groups",
  elements: "elements",
  aspherical: "Asph.",
  ed: "ED",
  superEd: "Super ED",
  sld: "SLD",
  fld: "FLD",
  highRefractive: "HR",
  incl: "incl.",
};

// ---------------------------------------------------------------------------
// oisDisplay
// ---------------------------------------------------------------------------
describe("oisDisplay", () => {
  it("returns no-label when ois is false", () => {
    expect(oisDisplay(false, undefined, oisLabels)).toBe("No");
  });

  it("returns yes-label without stops when oisStops is undefined", () => {
    expect(oisDisplay(true, undefined, oisLabels)).toBe("Yes");
  });

  it("appends stop count when oisStops is provided", () => {
    expect(oisDisplay(true, 5, oisLabels)).toBe("Yes (5-stop)");
  });
});

// ---------------------------------------------------------------------------
// tStopDisplay
// ---------------------------------------------------------------------------
describe("tStopDisplay", () => {
  it("returns undefined when tStop is undefined", () => {
    expect(tStopDisplay(undefined)).toBeUndefined();
  });

  it("formats a single T-stop", () => {
    expect(tStopDisplay(2.1)).toBe("T2.1");
  });

  it("formats a T-stop range", () => {
    expect(tStopDisplay([2.1, 16])).toBe("T2.1–16");
  });
});

// ---------------------------------------------------------------------------
// optionalNumber
// ---------------------------------------------------------------------------
describe("optionalNumber", () => {
  it("returns undefined when value is undefined", () => {
    expect(optionalNumber(undefined, "mm")).toBeUndefined();
  });

  it("appends unit to the number", () => {
    expect(optionalNumber(52, "mm")).toBe("52mm");
    expect(optionalNumber(0.5, "×")).toBe("0.5×");
  });
});

// ---------------------------------------------------------------------------
// weightDisplay
// ---------------------------------------------------------------------------
describe("weightDisplay", () => {
  it("returns undefined when weightG is undefined", () => {
    expect(weightDisplay(undefined, "g")).toBeUndefined();
  });

  it("formats a single weight", () => {
    expect(weightDisplay(187, "g")).toBe("187g");
  });

  it("formats a weight range", () => {
    expect(weightDisplay([300, 350], "g")).toBe("300–350g");
  });
});

// ---------------------------------------------------------------------------
// wrDisplay
// ---------------------------------------------------------------------------
describe("wrDisplay", () => {
  it("returns yes-label for true", () => {
    expect(wrDisplay(true, wrLabels)).toBe("Yes");
  });

  it("returns partial-label for 'partial'", () => {
    expect(wrDisplay("partial", wrLabels)).toBe("Partial");
  });

  it("returns no-label for false", () => {
    expect(wrDisplay(false, wrLabels)).toBe("No");
  });
});

// ---------------------------------------------------------------------------
// filterSizeDisplay
// ---------------------------------------------------------------------------
describe("filterSizeDisplay", () => {
  it("returns undefined when filterMm is undefined", () => {
    expect(filterSizeDisplay(undefined)).toBeUndefined();
  });

  it("returns SPEC_NA when filterMm is SPEC_NA", () => {
    expect(filterSizeDisplay(SPEC_NA)).toBe(SPEC_NA);
  });

  it("appends mm to a numeric value", () => {
    expect(filterSizeDisplay(52)).toBe("52mm");
  });
});

// ---------------------------------------------------------------------------
// angleOfViewDisplay
// ---------------------------------------------------------------------------
describe("angleOfViewDisplay", () => {
  it("returns undefined when value is undefined", () => {
    expect(angleOfViewDisplay(undefined)).toBeUndefined();
  });

  it("formats a single angle", () => {
    expect(angleOfViewDisplay(44)).toBe("44°");
  });

  it("formats an angle range", () => {
    expect(angleOfViewDisplay([76, 44])).toBe("76°–44°");
  });
});

// ---------------------------------------------------------------------------
// magnificationDisplay
// ---------------------------------------------------------------------------
describe("magnificationDisplay", () => {
  it("returns undefined when maxMagnification is undefined", () => {
    expect(magnificationDisplay(undefined)).toBeUndefined();
  });

  it("formats the value with x suffix", () => {
    expect(magnificationDisplay({ value: 0.5 })).toBe("0.5x");
  });
});

// ---------------------------------------------------------------------------
// dimensionsPrimaryDisplay
// ---------------------------------------------------------------------------
describe("dimensionsPrimaryDisplay", () => {
  it("returns undefined when both are undefined", () => {
    expect(dimensionsPrimaryDisplay(undefined, undefined)).toBeUndefined();
  });

  it("shows only diameter when length is undefined", () => {
    expect(dimensionsPrimaryDisplay(65, undefined)).toBe("⌀65mm");
  });

  it("shows only length when diameter is undefined", () => {
    const length: LensLength = { mm: 45 };
    expect(dimensionsPrimaryDisplay(undefined, length)).toBe("45mm");
  });

  it("shows diameter × length when both are present", () => {
    const length: LensLength = { mm: 45 };
    expect(dimensionsPrimaryDisplay(65, length)).toBe("⌀65 × 45mm");
  });
});

// ---------------------------------------------------------------------------
// dimensionsVariantsDisplay
// ---------------------------------------------------------------------------
describe("dimensionsVariantsDisplay", () => {
  it("returns undefined when length is undefined", () => {
    expect(dimensionsVariantsDisplay(undefined, variantLabels)).toBeUndefined();
  });

  it("returns undefined when length has no variants", () => {
    const length: LensLength = { mm: 45 };
    expect(dimensionsVariantsDisplay(length, variantLabels)).toBeUndefined();
  });

  it("shows retracted/wide/tele variants, each on its own line", () => {
    const length: LensLength = {
      mm: 85,
      variants: { retracted: 70, wide: 80, tele: 95 },
    };
    expect(dimensionsVariantsDisplay(length, variantLabels)).toBe(
      "Retracted 70mm\nWide 80mm\nTele 95mm"
    );
  });

  it("omits variant lines that are undefined", () => {
    const length: LensLength = { mm: 85, variants: { tele: 95 } };
    expect(dimensionsVariantsDisplay(length, variantLabels)).toBe("Tele 95mm");
  });
});

// ---------------------------------------------------------------------------
// dimensionsRichDisplay
// ---------------------------------------------------------------------------
describe("dimensionsRichDisplay", () => {
  it("returns undefined when both are undefined", () => {
    expect(dimensionsRichDisplay(undefined, undefined, variantLabels)).toBeUndefined();
  });

  it("returns single line when no variants", () => {
    const length: LensLength = { mm: 45 };
    expect(dimensionsRichDisplay(65, length, variantLabels)).toBe("⌀65 × 45mm");
  });

  it("appends variant line when variants are present", () => {
    const length: LensLength = { mm: 85, variants: { wide: 80, tele: 95 } };
    expect(dimensionsRichDisplay(65, length, variantLabels)).toBe(
      "⌀65 × 85mm\nWide 80mm · Tele 95mm"
    );
  });
});

// ---------------------------------------------------------------------------
// mfdHeroValue
// ---------------------------------------------------------------------------
describe("mfdHeroValue", () => {
  it("returns undefined when mfd is undefined", () => {
    expect(mfdHeroValue(undefined)).toBeUndefined();
  });

  it("shows normal.cm for primes without macro", () => {
    expect(mfdHeroValue({ normal: { cm: 28 } })).toBe("28cm");
  });

  it("uses macro.cm when macro exists (no teleCm)", () => {
    expect(mfdHeroValue({ normal: { cm: 28 }, macro: { cm: 12 } })).toBe("12cm");
  });

  it("uses min of macro wide/tele when macro has teleCm", () => {
    expect(mfdHeroValue({ normal: { cm: 25, teleCm: 38 }, macro: { cm: 10, teleCm: 15 } })).toBe("10cm");
  });

  it("uses min of normal wide/tele when no macro", () => {
    expect(mfdHeroValue({ normal: { cm: 25, teleCm: 38 } })).toBe("25cm");
  });

  it("picks tele when tele is shorter", () => {
    expect(mfdHeroValue({ normal: { cm: 50, teleCm: 30 } })).toBe("30cm");
  });
});

// ---------------------------------------------------------------------------
// mfdHeroQualifier
// ---------------------------------------------------------------------------
describe("mfdHeroQualifier", () => {
  it("returns undefined when no teleCm", () => {
    expect(mfdHeroQualifier({ normal: { cm: 28 } }, wideTeLabels)).toBeUndefined();
  });

  it("returns Wide when wide is shorter", () => {
    expect(mfdHeroQualifier({ normal: { cm: 25, teleCm: 38 } }, wideTeLabels)).toBe("Wide");
  });

  it("returns Tele when tele is shorter", () => {
    expect(mfdHeroQualifier({ normal: { cm: 50, teleCm: 30 } }, wideTeLabels)).toBe("Tele");
  });

  it("returns undefined when wide equals tele", () => {
    expect(mfdHeroQualifier({ normal: { cm: 30, teleCm: 30 } }, wideTeLabels)).toBeUndefined();
  });

  it("uses macro mode when macro exists", () => {
    expect(mfdHeroQualifier({ normal: { cm: 25, teleCm: 38 }, macro: { cm: 10, teleCm: 15 } }, wideTeLabels)).toBe("Wide");
  });
});

// ---------------------------------------------------------------------------
// mfdStructuredLines
// ---------------------------------------------------------------------------
describe("mfdStructuredLines", () => {
  it("returns undefined when mfd is undefined", () => {
    expect(mfdStructuredLines(undefined, wideTeLabels)).toBeUndefined();
  });

  it("returns undefined for prime without macro", () => {
    expect(mfdStructuredLines({ normal: { cm: 28 } }, wideTeLabels)).toBeUndefined();
  });

  it("returns normal wide/tele lines when no macro", () => {
    expect(mfdStructuredLines({ normal: { cm: 25, teleCm: 38 } }, wideTeLabels)).toEqual([
      { value: "25cm", label: "Wide" },
      { value: "38cm", label: "Tele" },
    ]);
  });

  it("returns macro wide/tele lines when macro has teleCm", () => {
    expect(mfdStructuredLines({ normal: { cm: 25, teleCm: 38 }, macro: { cm: 10, teleCm: 15 } }, wideTeLabels)).toEqual([
      { value: "10cm", label: "Wide" },
      { value: "15cm", label: "Tele" },
    ]);
  });

  it("returns undefined when macro exists without teleCm", () => {
    expect(mfdStructuredLines({ normal: { cm: 25, teleCm: 38 }, macro: { cm: 12 } }, wideTeLabels)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mfdComparable
// ---------------------------------------------------------------------------
describe("mfdComparable", () => {
  it("returns undefined when mfd is undefined", () => {
    expect(mfdComparable(undefined)).toBeUndefined();
  });

  it("returns normal.cm for primes", () => {
    expect(mfdComparable({ normal: { cm: 28 } })).toBe(28);
  });

  it("returns macro.cm when macro exists", () => {
    expect(mfdComparable({ normal: { cm: 28 }, macro: { cm: 12 } })).toBe(12);
  });

  it("returns min of macro wide/tele", () => {
    expect(mfdComparable({ normal: { cm: 25, teleCm: 38 }, macro: { cm: 10, teleCm: 15 } })).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// maxMagnificationPrimaryDisplay
// ---------------------------------------------------------------------------
describe("maxMagnificationPrimaryDisplay", () => {
  it("returns undefined when maxMag is undefined", () => {
    expect(maxMagnificationPrimaryDisplay(undefined, wideTeLabels)).toBeUndefined();
  });

  it("shows single value for prime", () => {
    const mag: MaxMagnification = { value: 0.5 };
    expect(maxMagnificationPrimaryDisplay(mag, wideTeLabels)).toBe("0.5x");
  });

  it("shows wide · tele inline for zoom with variants", () => {
    const mag: MaxMagnification = { value: 0.3, variants: { wide: 0.2, tele: 0.3 } };
    expect(maxMagnificationPrimaryDisplay(mag, wideTeLabels)).toBe("Wide 0.2x · Tele 0.3x");
  });
});

// ---------------------------------------------------------------------------
// maxMagnificationSecondaryDisplay
// ---------------------------------------------------------------------------
describe("maxMagnificationSecondaryDisplay", () => {
  it("returns undefined when maxMag is undefined", () => {
    expect(maxMagnificationSecondaryDisplay(undefined, wideTeLabels)).toBeUndefined();
  });

  it("returns undefined when no variants", () => {
    const mag: MaxMagnification = { value: 0.5 };
    expect(maxMagnificationSecondaryDisplay(mag, wideTeLabels)).toBeUndefined();
  });

  it("shows wide · tele when variants present", () => {
    const mag: MaxMagnification = { value: 0.3, variants: { wide: 0.2, tele: 0.3 } };
    expect(maxMagnificationSecondaryDisplay(mag, wideTeLabels)).toBe("Wide 0.2x · Tele 0.3x");
  });
});

// ---------------------------------------------------------------------------
// maxMagnificationRichDisplay
// ---------------------------------------------------------------------------
describe("maxMagnificationRichDisplay", () => {
  it("returns undefined when maxMag is undefined", () => {
    expect(maxMagnificationRichDisplay(undefined, wideTeLabels)).toBeUndefined();
  });

  it("shows single value when no variants", () => {
    const mag: MaxMagnification = { value: 0.5 };
    expect(maxMagnificationRichDisplay(mag, wideTeLabels)).toBe("0.5x");
  });

  it("shows wide · tele when variants present", () => {
    const mag: MaxMagnification = { value: 0.3, variants: { wide: 0.2, tele: 0.3 } };
    expect(maxMagnificationRichDisplay(mag, wideTeLabels)).toBe("Wide 0.2x · Tele 0.3x");
  });
});

// ---------------------------------------------------------------------------
// lensConfigurationPrimaryDisplay
// ---------------------------------------------------------------------------
describe("lensConfigurationPrimaryDisplay", () => {
  it("returns undefined when configuration is undefined", () => {
    expect(lensConfigurationPrimaryDisplay(undefined, configLabels)).toBeUndefined();
  });

  it("formats groups / elements", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11 };
    expect(lensConfigurationPrimaryDisplay(cfg, configLabels)).toBe("9 groups / 11 elements");
  });
});

// ---------------------------------------------------------------------------
// lensConfigurationSecondaryDisplay
// ---------------------------------------------------------------------------
describe("lensConfigurationSecondaryDisplay", () => {
  it("returns undefined when configuration is undefined", () => {
    expect(lensConfigurationSecondaryDisplay(undefined, configLabels)).toBeUndefined();
  });

  it("returns undefined when no element types are present", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11 };
    expect(lensConfigurationSecondaryDisplay(cfg, configLabels)).toBeUndefined();
  });

  it("formats aspherical elements", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11, aspherical: 3 };
    expect(lensConfigurationSecondaryDisplay(cfg, configLabels)).toBe("3 Asph.");
  });

  it("merges ED + SLD into one line with incl. clause", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11, ed: 3, sld: 2 };
    expect(lensConfigurationSecondaryDisplay(cfg, configLabels)).toBe(
      "5 ED (incl. 2 SLD)"
    );
  });

  it("shows only ED when no SLD", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11, ed: 3 };
    expect(lensConfigurationSecondaryDisplay(cfg, configLabels)).toBe("3 ED");
  });

  it("shows only SLD labelled as ED when base ED is absent", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11, sld: 2 };
    expect(lensConfigurationSecondaryDisplay(cfg, configLabels)).toBe("2 ED (2 SLD)");
  });

  it("merges Super ED + FLD", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11, superEd: 1, fld: 2 };
    expect(lensConfigurationSecondaryDisplay(cfg, configLabels)).toBe(
      "3 Super ED (incl. 2 FLD)"
    );
  });

  it("joins multiple element types with · separator", () => {
    const cfg: LensConfiguration = {
      groups: 10,
      elements: 14,
      aspherical: 2,
      ed: 3,
      highRefractive: 1,
    };
    expect(lensConfigurationSecondaryDisplay(cfg, configLabels)).toBe(
      "2 Asph. · 3 ED · 1 HR"
    );
  });
});

// ---------------------------------------------------------------------------
// lensConfigurationDisplay (combined)
// ---------------------------------------------------------------------------
describe("lensConfigurationDisplay", () => {
  it("returns undefined when configuration is undefined", () => {
    expect(lensConfigurationDisplay(undefined, configLabels)).toBeUndefined();
  });

  it("returns primary line only when no element types", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11 };
    expect(lensConfigurationDisplay(cfg, configLabels)).toBe("9 groups / 11 elements");
  });

  it("returns primary + secondary separated by newline", () => {
    const cfg: LensConfiguration = { groups: 9, elements: 11, aspherical: 3, ed: 2 };
    expect(lensConfigurationDisplay(cfg, configLabels)).toBe(
      "9 groups / 11 elements\n3 Asph. · 2 ED"
    );
  });
});
