import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import { defaultFilters } from "@/lib/lens/lens";
import { describeFilters, parsePagePath } from "../page-ref";

describe("describeFilters", () => {
  const labels = {
    list: createTranslator({ locale: "en", messages: en, namespace: "LensList" }),
    badge: createTranslator({ locale: "en", messages: en, namespace: "SpecialtyBadge" }),
    brand: (slug: string) => slug,
  };

  it("describes the custom reference and both numeric limits", () => {
    expect(describeFilters({ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" }, maxAperture: 2.8, weightLimit: 500 }, labels)).toEqual([
      "Around 40mm equivalent", "F2.8 or faster", "Up to 500g",
    ]);
  });

  it("does not describe an empty custom target as a constraint", () => {
    expect(describeFilters({ ...defaultFilters, focalLength: { value: null, reference: "actual" } }, labels)).toEqual([]);
  });
});

describe("parsePagePath", () => {
  it("reads browse filters, compared lenses and a lens page, with or without a locale", () => {
    expect(parsePagePath("/zh/lenses/x/browse?t=zoom")).toMatchObject({ kind: "browse", mount: "X", filters: { typeFilter: "zoom" } });
    expect(parsePagePath("/en/lenses/gfx/compare?ids=a%2Cb")).toEqual({ kind: "compare", mount: "G", lensIds: ["a", "b"] });
    expect(parsePagePath("/lenses/x/xf-56")).toEqual({ kind: "lens", mount: "X", lensId: "xf-56" });
  });

  it("has no page for other paths", () => {
    for (const path of ["/", "/en/about", "/en/lenses/x/collections", "/en/lenses/x/collections/pancake", "/en/lenses/x/compare", "/en/lenses/y/xf-56"]) {
      expect(parsePagePath(path)).toBeNull();
    }
  });
});

