import { describe, expect, it } from "vitest";
import { emptyDraft, validateDraft, type ManualLensDraft } from "../manual-lens-draft";

function draft(overrides: Partial<ManualLensDraft>): ManualLensDraft {
  return { ...emptyDraft("X"), brand: "Helios", model: "44-2 58mm F2", focalMin: "58", ...overrides };
}

describe("validateDraft", () => {
  it("builds a prime from the required fields and the default photo usage", () => {
    expect(validateDraft(draft({}))).toEqual({
      lens: { brand: "Helios", model: "44-2 58mm F2", mount: "X", focalMinMm: 58, focalMaxMm: 58, usage: "photo" },
    });
  });

  it("keeps the optional details that were filled in", () => {
    const result = validateDraft(
      draft({
        apertureWide: "f/2",
        autofocus: false,
        adapted: true,
        originalMount: "M42",
        features: ["apertureRing", "powerZoom"],
        opticalTraits: ["macro"],
        usage: "photo",
        focusMotor: "unknown",
        weight: "230",
        notes: "  Swirly bokeh  ",
      }),
    );

    expect(result.lens).toEqual({
      brand: "Helios",
      model: "44-2 58mm F2",
      mount: "X",
      focalMinMm: 58,
      focalMaxMm: 58,
      maxApertureWide: 2,
      autofocus: false,
      adapted: true,
      originalMount: "M42",
      apertureRing: true,
      opticalTraits: ["macro"],
      usage: "photo",
      focusMotor: "unknown",
      weightG: 230,
      notes: "Swirly bokeh",
    });
  });

  it("drops the original mount unless the lens is adapted", () => {
    expect(validateDraft(draft({ originalMount: "M42" })).lens).not.toHaveProperty("originalMount");
  });

  it("builds a zoom with a variable aperture and zoom-only features", () => {
    const result = validateDraft(
      draft({ zoom: true, focalMin: "18", focalMax: "55", apertureWide: "2.8", apertureTele: "4", features: ["powerZoom"] }),
    );

    expect(result.lens).toMatchObject({ focalMinMm: 18, focalMaxMm: 55, maxApertureWide: 2.8, maxApertureTele: 4, powerZoom: true });
  });

  it("reports every missing required field at once", () => {
    expect(validateDraft(emptyDraft("X")).errors).toEqual({
      brand: "errorRequired",
      model: "errorRequired",
      focalMin: "errorRequired",
    });
  });

  it.each([
    [{ brand: " " }, { brand: "errorRequired" }],
    [{ focalMin: "" }, { focalMin: "errorRequired" }],
    [{ focalMin: "abc" }, { focalMin: "errorNumber" }],
    [{ zoom: true, focalMin: "55", focalMax: "18" }, { focalMin: "errorFocalOrder" }],
    [{ apertureWide: "0.5" }, { apertureWide: "errorAperture" }],
    [{ zoom: true, focalMin: "18", focalMax: "55", apertureWide: "4", apertureTele: "2.8" }, { apertureTele: "errorApertureOrder" }],
    [{ zoom: true, focalMin: "18", focalMax: "55", apertureTele: "4" }, { apertureWide: "errorRequired" }],
  ])("reports %o as %o", (overrides, errors) => {
    expect(validateDraft(draft(overrides)).errors).toEqual(errors);
  });
});
