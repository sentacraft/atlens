import { describe, expect, it } from "vitest";
import { defaultLensName, emptyDraft, validateDraft, type ManualLensDraft } from "../manual-lens-draft";

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
      draft({ focalMin: "18", focalMax: "55", apertureWide: "2.8", apertureTele: "4", features: ["powerZoom"] }),
    );

    expect(result.lens).toMatchObject({ focalMinMm: 18, focalMaxMm: 55, maxApertureWide: 2.8, maxApertureTele: 4, powerZoom: true });
  });

  it("reports every missing required field at once", () => {
    expect(validateDraft(emptyDraft("X")).errors).toEqual({
      brand: "errorRequired",
      focalMin: "errorRequired",
    });
  });

  it.each([
    [{ brand: " " }, { brand: "errorRequired" }],
    [{ focalMin: "" }, { focalMin: "errorRequired" }],
    [{ focalMin: "abc" }, { focalMin: "errorNumber" }],
    [{ focalMin: "55", focalMax: "18" }, { focalMin: "errorFocalOrder" }],
    [{ apertureWide: "0.5" }, { apertureWide: "errorAperture" }],
    [{ focalMin: "18", focalMax: "55", apertureWide: "4", apertureTele: "2.8" }, { apertureTele: "errorApertureOrder" }],
    [{ focalMin: "18", focalMax: "55", apertureTele: "4" }, { apertureWide: "errorRequired" }],
    [{ focalMin: "18", focalMax: "abc" }, { focalMax: "errorNumber" }],
  ])("reports %o as %o", (overrides, errors) => {
    expect(validateDraft(draft(overrides)).errors).toEqual(errors);
  });

  it("treats a longest focal length equal to the shortest as a prime", () => {
    const result = validateDraft(draft({ focalMin: "50", focalMax: "50", apertureWide: "1.4", apertureTele: "2" }));

    expect(result.lens).toMatchObject({ focalMinMm: 50, focalMaxMm: 50, maxApertureWide: 1.4 });
    expect(result.lens).not.toHaveProperty("maxApertureTele");
  });

  it("keeps a zoom with one aperture as a constant-aperture zoom", () => {
    const result = validateDraft(draft({ focalMin: "18", focalMax: "50", apertureWide: "2.8" }));

    expect(result.lens).toMatchObject({ focalMinMm: 18, focalMaxMm: 50, maxApertureWide: 2.8 });
    expect(result.lens).not.toHaveProperty("maxApertureTele");
  });

  it("names a lens from its focal length and aperture when the name is left blank", () => {
    expect(validateDraft(draft({ model: "  ", focalMin: "18", focalMax: "50", apertureWide: "2.8" })).lens?.model).toBe("18-50mm F2.8");
  });
});

describe("defaultLensName", () => {
  it.each([
    [{ focalMin: "" }, undefined],
    [{ focalMin: "35" }, "35mm"],
    [{ focalMin: "35", apertureWide: "f/1.4" }, "35mm F1.4"],
    [{ focalMin: "18", focalMax: "50", apertureWide: "2.8" }, "18-50mm F2.8"],
    [{ focalMin: "18", focalMax: "55", apertureWide: "2.8", apertureTele: "4" }, "18-55mm F2.8-4"],
    [{ focalMin: "35", focalMax: "35", apertureWide: "2", apertureTele: "2.8" }, "35mm F2"],
    [{ focalMin: "18", focalMax: "55", apertureWide: "2.8", apertureTele: "x" }, "18-55mm F2.8"],
    [{ focalMin: "25", apertureWide: "1.5", usage: "cine" as const }, "25mm T1.5"],
  ])("names %o as %s", (overrides, name) => {
    expect(defaultLensName({ ...emptyDraft("X"), ...overrides })).toBe(name);
  });
});
