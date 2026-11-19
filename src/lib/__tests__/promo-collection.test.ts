import { describe, expect, it } from "vitest";
import { FILTERS } from "@/lib/collection-filters";
import { buildPromoGroupPages, promoFileName, promoLens, PROMO_THEMES } from "@/lib/promo-collection";
import type { Lens } from "@/lib/types";
import catalog from "@/data/lenses.json";

const toRow = (lens: Lens) => promoLens(lens, lens.brand, `/lenses/${lens.id}.webp`);
const pancake = (catalog as Lens[]).filter((lens) => FILTERS.pancake(lens));

describe("collection promo pages", () => {
  it("copies only the mainland new reference amount into the poster", () => {
    const offer = { price: 2890, currency: "CNY" as const, source: "Example shop", url: "https://example.com/offer", sampledAt: "2026-10-05" };
    const row = toRow({ ...pancake[0], pricing: { cn: { new: [offer] } } });
    expect(row.referencePrice).toBe("¥2,890");
    expect(JSON.stringify(row)).not.toMatch(/Example shop|example\.com|2026-10-05/);
    expect(toRow({ ...pancake[0], pricing: { cn: { used: offer } } }).referencePrice).toBeUndefined();
  });

  it("gives each pancake focal band its own page without dropping or duplicating a lens", () => {
    const pages = buildPromoGroupPages(pancake, toRow, PROMO_THEMES.pancake);
    expect(pages.map(({ range }) => range)).toEqual(["15–21mm", "27mm", "35–38mm", "41–53mm"]);
    const rows = pages.flatMap((page) => page.groups.flatMap((group) => group.lenses));
    expect(rows.map((row) => row.id).sort()).toEqual(pancake.map((lens) => lens.id).sort());
    expect(pages[1].groups[0].lenses.map((lens) => Number(lens.length))).toEqual(
      pages[1].groups[0].lenses.map((lens) => Number(lens.length)).sort((a, b) => a - b),
    );
  });

  it("sorts same-focal-length lenses by the theme's primary spec", () => {
    const lens = pancake[0];
    const lenses = [
      { ...lens, id: "light", weightG: 60, maxAperture: 2.8, angleOfView: 170 },
      { ...lens, id: "wide", weightG: 100, maxAperture: 1.4, angleOfView: 190 },
      { ...lens, id: "unknown", weightG: 110, maxAperture: undefined, angleOfView: undefined },
    ];
    const ids = (theme: keyof typeof PROMO_THEMES) => buildPromoGroupPages(lenses, toRow, PROMO_THEMES[theme])[0].groups[0].lenses.map((row) => row.id);
    expect(ids("under-200g")).toEqual(["light", "wide", "unknown"]);
    expect(ids("fast-aperture-primes")).toEqual(["wide", "light", "unknown"]);
    expect(ids("fisheye")).toEqual(["wide", "light", "unknown"]);
    expect(toRow(lenses[2]).angle).toBe("—");
  });

  it("keeps lightweight primes and zooms on separate pages and ranks weight ranges by their upper end", () => {
    const lens = pancake[0];
    const pages = buildPromoGroupPages([
      { ...lens, id: "prime-later", focalLengthMin: 23, focalLengthMax: 23, weightG: 80 },
      { ...lens, id: "prime-range", focalLengthMin: 16, focalLengthMax: 16, weightG: [90, 170] },
      { ...lens, id: "prime-fixed", focalLengthMin: 16, focalLengthMax: 16, weightG: 120 },
      { ...lens, id: "zoom-range", focalLengthMin: 13, focalLengthMax: 33, weightG: [110, 190] },
      { ...lens, id: "zoom-fixed", focalLengthMin: 16, focalLengthMax: 50, weightG: 145 },
    ], toRow, PROMO_THEMES["under-200g"]);
    expect(pages.map((page) => Boolean(page.zoom))).toEqual([false, true]);
    expect(pages.map((page) => page.groups.flatMap((group) => group.lenses.map((row) => row.id)))).toEqual([
      ["prime-fixed", "prime-range", "prime-later"], ["zoom-fixed", "zoom-range"],
    ]);
  });

  it("compares near-23mm lenses by aperture before focal length", () => {
    const lens = pancake[0];
    const pages = buildPromoGroupPages([
      { ...lens, id: "short", focalLengthMin: 22, focalLengthMax: 22, maxAperture: 2.8 },
      { ...lens, id: "wide", focalLengthMin: 24, focalLengthMax: 24, maxAperture: 1.4 },
    ], toRow, PROMO_THEMES["23mm"]);
    expect(pages).toHaveLength(1);
    expect(pages[0].groups.flatMap((group) => group.lenses.map((row) => row.id))).toEqual(["wide", "short"]);
  });

  it("keeps AF and MF on separate pages and sorts by numeric mainland new price", () => {
    const lens = pancake[0];
    const priced = (id: string, af: boolean, price: number, focalLengthMin: number): Lens => ({
      ...lens, id, af, focalLengthMin, focalLengthMax: focalLengthMin,
      pricing: { cn: { new: [{ price, currency: "CNY", source: "Shop", url: "https://example.com", sampledAt: "2026-10-05" }] } },
    });
    const pages = buildPromoGroupPages([
      priced("cheap-mf", false, 250, 18), priced("cheap-af", true, 99, 50), priced("pricey-af", true, 550, 16),
      ...Array.from({ length: 5 }, (_, i) => priced(`af-${i}`, true, 600 + i, 18)),
    ], toRow, PROMO_THEMES["under-200"]);
    expect(pages.map((page) => page.focus)).toEqual(["AF", "AF", "MF"]);
    expect(pages.map((page) => page.groups.flatMap((group) => group.lenses.map((row) => row.id)))).toEqual([
      ["cheap-af", "pricey-af", "af-0", "af-1", "af-2", "af-3"], ["af-4"], ["cheap-mf"],
    ]);
  });

  it("shows both ends of a travel zoom's actual focal range", () => {
    const lens = { ...pancake[0], focalLengthMin: 18, focalLengthMax: 135 };
    expect(toRow(lens).focal).toBe("18–135");
    expect(PROMO_THEMES["travel-zoom"].columns).toEqual(["focal", "weight"]);
  });

  it("continues an oversized group and keeps ranges and numbered filenames", () => {
    const source = pancake.find((lens) => Array.isArray(lens.weightG))!;
    const lenses = Array.from({ length: 8 }, (_, i) => ({ ...source, id: `lens-${i}` }));
    const pages = buildPromoGroupPages(lenses, toRow, PROMO_THEMES["under-200g"]);
    expect(pages.map((page) => page.groups[0].lenses.length)).toEqual([6, 2]);
    expect(pages[0].groups[0].lenses[0].weight).toMatch(/^\d+–\d+$/);
    expect(promoFileName("pancake", 2)).toBe("02-pancake.png");
  });
});
