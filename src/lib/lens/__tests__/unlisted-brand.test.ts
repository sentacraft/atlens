import { describe, expect, it } from "vitest";
import { namedUnlistedBrand } from "../unlisted-brand";

const PRESENT = new Set(["fujifilm", "sigma", "viltrox"]);

describe("namedUnlistedBrand", () => {
  it("names a catalog brand that has no lenses yet", () => {
    expect(namedUnlistedBrand("zeiss", PRESENT)).toEqual({ kind: "catalog", slug: "zeiss" });
    expect(namedUnlistedBrand("蔡司", PRESENT)).toEqual({ kind: "catalog", slug: "zeiss" });
    expect(namedUnlistedBrand("Zeiss 50", PRESENT)).toEqual({ kind: "catalog", slug: "zeiss" });
  });

  it("names a maker the catalog does not cover, by any spelling", () => {
    expect(namedUnlistedBrand("samyang 12", PRESENT)).toMatchObject({ kind: "other", name: { en: "Samyang" } });
    expect(namedUnlistedBrand("三阳", PRESENT)).toMatchObject({ kind: "other", name: { zh: "三阳" } });
    expect(namedUnlistedBrand("Rokinon", PRESENT)).toMatchObject({ kind: "other", name: { en: "Samyang" } });
    expect(namedUnlistedBrand("永诺", PRESENT)).toMatchObject({ kind: "other", name: { en: "Yongnuo" } });
  });

  it("stays quiet for a brand that has lenses, since a miss then has another cause", () => {
    expect(namedUnlistedBrand("适马9999", PRESENT)).toBeNull();
    expect(namedUnlistedBrand("sigma 9999", PRESENT)).toBeNull();
  });

  it("stays quiet for a model, a number or an unknown word", () => {
    expect(namedUnlistedBrand("xf 56", PRESENT)).toBeNull();
    expect(namedUnlistedBrand("56", PRESENT)).toBeNull();
    expect(namedUnlistedBrand("zenitar", PRESENT)).toBeNull();
    expect(namedUnlistedBrand("", PRESENT)).toBeNull();
  });

  it("does not take a longer word that starts with a brand name for the brand", () => {
    expect(namedUnlistedBrand("zeissx", PRESENT)).toBeNull();
  });
});
