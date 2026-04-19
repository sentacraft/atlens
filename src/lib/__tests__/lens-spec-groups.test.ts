import { describe, expect, it } from "vitest";
import { buildSpecGroups, resolveSpecRow } from "@/lib/lens-spec-groups";
import type { Lens } from "@/lib/types";

const labels = {
  groupOptics: "Optics",
  groupFocus: "Focus",
  groupStabilization: "Stabilization",
  groupPhysical: "Physical",
  groupFeatures: "Features",
  groupRelease: "Release",
  focalLength: "Focal Length",
  focalLengthEquiv: "35mm Equivalent",
  maxAperture: "Max Aperture",
  minAperture: "Min Aperture",
  maxTStop: "Max T-Stop",
  minTStop: "Min T-Stop",
  angleOfView: "Angle of View",
  angleOfViewEstNote: "Estimated",
  apertureBladeCount: "Aperture Blades",
  lensConfiguration: "Lens Configuration",
  af: "AF",
  focusMotor: "Focus Motor",
  internalFocusing: "Internal Focusing",
  minFocusDist: "Min Focus Distance",
  maxMagnification: "Max Magnification",
  ois: "OIS",
  weight: "Weight",
  dimensions: "Dimensions",
  filterSize: "Filter Size",
  lensMaterial: "Lens Material",
  wr: "WR",
  apertureRing: "Aperture Ring",
  powerZoom: "Power Zoom",
  specialtyTags: "Specialty Tags",
  releaseYear: "Release Year",
  releaseYearLabelNote: "For lenses available in multiple mounts, this is the year the Fujifilm X mount version was released.",
  accessories: "Accessories",
  yes: "Yes",
  no: "No",
  partial: "Partial",
  retracted: "Retracted",
  wide: "Wide",
  tele: "Tele",
  macro: "Macro",
  lc: {
    groups: "groups",
    elements: "elements",
    aspherical: "aspherical",
    ed: "ED",
    superEd: "Super ED",
    sld: "SLD",
    fld: "FLD",
    highRefractive: "HR",
    incl: "incl.",
  },
  tags: {
    cine: "Cine",
    anamorphic: "Anamorphic",
    tilt: "Tilt",
    shift: "Shift",
    macro: "Macro",
    ultra_macro: "Ultra Macro",
    fisheye: "Fisheye",
    probe: "Probe",
  },
  motorClass: {
    linear: "Linear",
    stepping: "Stepping",
    other: "Other",
  },
} as const;

const valueLabels = {
  yes: "Yes",
  no: "No",
  partial: "Partial",
  unknown: "Unknown",
  missing: "—",
} as const;

function makeLens(overrides: Partial<Lens> = {}): Lens {
  return {
    id: "test-lens",
    brand: "fujifilm",
    model: "Test Lens",
    officialLinks: {},
    focalLengthMin: 18,
    focalLengthMax: 55,
    maxAperture: [2.8, 4],
    minAperture: 22,
    af: true,
    ois: false,
    wr: false,
    apertureRing: false,
    ...overrides,
  };
}

function getRow(label: string) {
  const row = buildSpecGroups(labels)
    .flatMap((group) => group.rows)
    .find((candidate) => candidate.label === label);

  expect(row).toBeDefined();
  return row!;
}

describe("resolveSpecRow — plainText", () => {
  it("includes secondary text for bool rows", () => {
    const lens = makeLens({ ois: true, oisStops: 5 });
    const row = getRow("OIS");

    expect(resolveSpecRow(row, lens, valueLabels)?.plainText).toBe("Yes\n5 stops");
  });

  it("serializes structured numeric rows and macro details", () => {
    const lens = makeLens({
      minFocusDistance: {
        cm: 15,
        variants: { wide: 15, tele: 30 },
        macroCm: 12,
      },
    });
    const row = getRow("Min Focus Distance");

    expect(resolveSpecRow(row, lens, valueLabels)?.plainText).toBe(
      "15cm (Wide)\n30cm (Tele)\nMacro: 12cm"
    );
  });

  it("preserves primary and secondary text rows", () => {
    const lens = makeLens({
      diameterMm: 65,
      length: { mm: 71, variants: { retracted: 60, tele: 89 } },
    });
    const row = getRow("Dimensions");

    expect(resolveSpecRow(row, lens, valueLabels)?.plainText).toBe(
      "⌀65 × 71mm\nRetracted 60mm\nTele 89mm"
    );
  });
});
