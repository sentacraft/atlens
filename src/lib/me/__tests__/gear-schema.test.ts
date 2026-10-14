import { describe, expect, it } from "vitest";
import { normalizeBrand } from "../brand";
import { gearInputSchema, manualLensSchema } from "../gear-schema";
import { userSettingsPatchSchema } from "../settings-schema";

const prime = { brand: "Pentax", model: "SMC 50mm F1.7", mount: "X", focalMinMm: 50, focalMaxMm: 50 } as const;
const zoom = { ...prime, model: "Zoom 18-55", focalMinMm: 18, focalMaxMm: 55 } as const;

function issuePaths(input: unknown) {
  const result = manualLensSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("manualLensSchema", () => {
  it("accepts the required fields alone", () => {
    expect(issuePaths(prime)).toEqual([]);
  });

  it("rejects a focal range that runs backwards", () => {
    expect(issuePaths({ ...zoom, focalMinMm: 55, focalMaxMm: 18 })).toEqual(["focalMinMm"]);
  });

  it("accepts a variable aperture and rejects one whose tele end is brighter", () => {
    expect(issuePaths({ ...zoom, maxApertureWide: 2.8, maxApertureTele: 4 })).toEqual([]);
    expect(issuePaths({ ...zoom, maxApertureWide: 4, maxApertureTele: 2.8 })).toEqual(["maxApertureTele"]);
    expect(issuePaths({ ...zoom, maxApertureTele: 4 })).toEqual(["maxApertureTele"]);
  });

  it("keeps apertures within F0.7 to F64", () => {
    expect(issuePaths({ ...prime, maxApertureWide: 0.5 })).toEqual(["maxApertureWide"]);
    expect(issuePaths({ ...prime, maxApertureWide: 90 })).toEqual(["maxApertureWide"]);
  });

  it("allows zoom-only traits on zooms only", () => {
    expect(issuePaths({ ...zoom, powerZoom: true, internalZoom: false })).toEqual([]);
    expect(issuePaths({ ...prime, powerZoom: false })).toEqual(["powerZoom"]);
  });

  it("needs adapted: true before an original mount", () => {
    expect(issuePaths({ ...prime, adapted: true, originalMount: "M42" })).toEqual([]);
    expect(issuePaths({ ...prime, originalMount: "M42" })).toEqual(["originalMount"]);
  });

  it("rejects unknown fields", () => {
    expect(manualLensSchema.safeParse({ ...prime, price: 100 }).success).toBe(false);
  });
});

describe("gearInputSchema", () => {
  it("accepts a catalog body or lens and a manual lens", () => {
    expect(gearInputSchema.safeParse({ kind: "body", catalogId: "fujifilm-x-t5" }).success).toBe(true);
    expect(gearInputSchema.safeParse({ kind: "lens", catalogId: "x" }).success).toBe(true);
    expect(gearInputSchema.safeParse({ kind: "lens", manual: prime }).success).toBe(true);
  });

  it("rejects a manual body", () => {
    expect(gearInputSchema.safeParse({ kind: "body", manual: prime }).success).toBe(false);
  });
});

describe("normalizeBrand", () => {
  it.each([
    ["TTArtisan", "ttartisan"],
    ["tt artisan", "ttartisan"],
    ["铭匠", "ttartisan"],
    ["Voigtlander", "voigtlander"],
    ["voigtländer", "voigtlander"],
    ["SG-Image", "sgimage"],
    ["  富士 ", "fujifilm"],
  ])("maps %s to the catalog brand %s", (input, slug) => {
    expect(normalizeBrand(input)).toBe(slug);
  });

  it("keeps an unknown brand as typed, trimmed", () => {
    expect(normalizeBrand(" Pentax ")).toBe("Pentax");
  });
});

describe("userSettingsPatchSchema", () => {
  it("accepts a partial patch and a cleared language", () => {
    expect(userSettingsPatchSchema.safeParse({ defaultMount: "G" }).success).toBe(true);
    expect(userSettingsPatchSchema.safeParse({ locale: null }).success).toBe(true);
  });

  it("rejects an empty patch and unknown values", () => {
    expect(userSettingsPatchSchema.safeParse({}).success).toBe(false);
    expect(userSettingsPatchSchema.safeParse({ locale: "ja" }).success).toBe(false);
    expect(userSettingsPatchSchema.safeParse({ theme: "dark" }).success).toBe(false);
  });
});
