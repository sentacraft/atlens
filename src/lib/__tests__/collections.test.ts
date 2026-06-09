import { describe, it, expect } from "vitest";
import { COLLECTIONS, getCollectionStats, getRelatedCollections, getSharedCollections } from "../collections";
import { isZoom } from "../lens/lens";
import { getAllLenses } from "../lens/data";
import type { Lens } from "../types";

const allLenses = getAllLenses("en");
const xLenses = allLenses.filter((l) => l.mount === "X");
const xPhotoLenses = xLenses.filter((l) => !l.isCine);

function matchingLenses(slug: string, locale = "en"): Lens[] {
  const col = COLLECTIONS[slug];
  if (!col) {
    return [];
  }
  return allLenses.filter((l) => col.filter(l, locale));
}

// ---------------------------------------------------------------------------
// Structural integrity
// ---------------------------------------------------------------------------
describe("COLLECTIONS integrity", () => {
  it("has at least 20 collections", () => {
    expect(Object.keys(COLLECTIONS).length).toBeGreaterThanOrEqual(20);
  });

  it("every collection matches at least one lens", () => {
    for (const [slug, col] of Object.entries(COLLECTIONS)) {
      const count = allLenses.filter((l) => col.filter(l, "en")).length;
      expect(count, `"${slug}" matched 0 lenses`).toBeGreaterThan(0);
    }
  });

  it("every collection has title and description in both locales", () => {
    for (const col of Object.values(COLLECTIONS)) {
      expect(col.title.en).toBeTruthy();
      expect(col.title.zh).toBeTruthy();
      expect(col.description.en).toBeTruthy();
      expect(col.description.zh).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Filter predicates — focal range collections
// ---------------------------------------------------------------------------
describe("prime focal filters", () => {
  it.each([
    ["23mm", 22, 24],
    ["35mm", 33, 36],
    ["50mm", 48, 51],
    ["56mm", 55, 58],
    ["85mm", 83, 90],
  ] as const)("%s matches only X-photo primes in [%d, %d]mm", (slug, min, max) => {
    const lenses = matchingLenses(slug);
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(l.mount).toBe("X");
      expect(l.isCine).not.toBe(true);
      expect(isZoom(l)).toBe(false);
      expect(l.focalLengthMin).toBeGreaterThanOrEqual(min);
      expect(l.focalLengthMin).toBeLessThanOrEqual(max);
    }
  });
});

describe("wide-angle-primes", () => {
  it("matches only primes with focalLengthMin <= 18", () => {
    const lenses = matchingLenses("wide-angle-primes");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(isZoom(l)).toBe(false);
      expect(l.focalLengthMin).toBeLessThanOrEqual(18);
    }
  });
});

// General-purpose framing collections must not surface specialty optics
// (fisheye / macro / tilt-shift) — those live in their dedicated collections.
describe("specialty optics are excluded from framing collections", () => {
  const SPECIAL = ["fisheye", "macro", "tilt", "shift"];
  for (const slug of [
    "pancake",
    "wide-angle-primes",
    "wide-zoom",
    "chinese-af",
    "chinese-mf-fast",
    "chinese-mf-budget",
  ]) {
    it(`${slug} excludes specialty optics`, () => {
      const lenses = matchingLenses(slug);
      expect(lenses.length).toBeGreaterThan(0);
      for (const l of lenses) {
        for (const trait of SPECIAL) {
          expect(l.opticalTraits ?? []).not.toContain(trait);
        }
      }
    });
  }
});

describe("pancake", () => {
  it("matches only primes with a barrel length of 35mm or less", () => {
    const lenses = matchingLenses("pancake");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(isZoom(l)).toBe(false);
      expect(l.length?.mm).toBeDefined();
      expect(l.length!.mm).toBeLessThanOrEqual(35);
    }
  });
});

// ---------------------------------------------------------------------------
// Filter predicates — zoom collections
// ---------------------------------------------------------------------------
describe("zoom collections", () => {
  it("wide-zoom matches zooms with focalLengthMin <= 12", () => {
    const lenses = matchingLenses("wide-zoom");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(isZoom(l)).toBe(true);
      expect(l.focalLengthMin).toBeLessThanOrEqual(12);
    }
  });

  it("standard-zoom matches zooms in 13-20mm min and 40-60mm max range", () => {
    const lenses = matchingLenses("standard-zoom");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(isZoom(l)).toBe(true);
      expect(l.focalLengthMin).toBeGreaterThanOrEqual(13);
      expect(l.focalLengthMin).toBeLessThanOrEqual(20);
      expect(l.focalLengthMax).toBeGreaterThanOrEqual(40);
      expect(l.focalLengthMax).toBeLessThanOrEqual(60);
    }
  });

  it("tele-zoom matches zooms with focalLengthMin >= 50", () => {
    const lenses = matchingLenses("tele-zoom");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(isZoom(l)).toBe(true);
      expect(l.focalLengthMin).toBeGreaterThanOrEqual(50);
    }
  });
});

// ---------------------------------------------------------------------------
// Filter predicates — brand/series
// ---------------------------------------------------------------------------
describe("brand collections", () => {
  it("fujifilm matches only fujifilm X-photo lenses", () => {
    const lenses = matchingLenses("fujifilm");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(l.brand).toBe("fujifilm");
      expect(l.mount).toBe("X");
      expect(l.isCine).not.toBe(true);
    }
  });

  it("viltrox collection only includes AF lenses", () => {
    const lenses = matchingLenses("viltrox");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(l.brand).toBe("viltrox");
      expect(l.af).toBe(true);
    }
  });
});

describe("series collections", () => {
  it("fujifilm-xf matches fujifilm XF series", () => {
    const lenses = matchingLenses("fujifilm-xf");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(l.brand).toBe("fujifilm");
      expect(l.series).toBe("XF");
    }
  });
});

// ---------------------------------------------------------------------------
// Filter predicates — special filters
// ---------------------------------------------------------------------------
describe("special filters", () => {
  it("cine matches only cine lenses on X mount", () => {
    const lenses = matchingLenses("cine");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(l.mount).toBe("X");
      expect(l.isCine).toBe(true);
    }
  });

  it("weather-sealed matches wr===true or wr==='partial'", () => {
    const lenses = matchingLenses("weather-sealed");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect([true, "partial"]).toContain(l.wr);
    }
  });

  it("fast-aperture-primes matches primes with aperture <= 1.4", () => {
    const lenses = matchingLenses("fast-aperture-primes");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(isZoom(l)).toBe(false);
      const ap = Array.isArray(l.maxAperture) ? l.maxAperture[0] : l.maxAperture;
      expect(ap).toBeLessThanOrEqual(1.4);
    }
  });

  it("constant-aperture matches zooms with non-array maxAperture", () => {
    const lenses = matchingLenses("constant-aperture");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(isZoom(l)).toBe(true);
      expect(Array.isArray(l.maxAperture)).toBe(false);
    }
  });

  it("under-200g matches X-photo lenses under 200g", () => {
    const lenses = matchingLenses("under-200g");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      const w = Array.isArray(l.weightG) ? l.weightG[1] : l.weightG;
      expect(w).toBeLessThan(200);
    }
  });

  it("macro matches lenses with macro optical trait", () => {
    const lenses = matchingLenses("macro");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(l.opticalTraits).toContain("macro");
    }
  });
});

// ---------------------------------------------------------------------------
// Price collections are locale-aware
// ---------------------------------------------------------------------------
describe("price collections", () => {
  it("under-200 uses global pricing for en, cn pricing for zh", () => {
    const col = COLLECTIONS["under-200"];
    if (!col) {
      return;
    }
    const enLenses = allLenses.filter((l) => col.filter(l, "en"));
    const zhLenses = allLenses.filter((l) => col.filter(l, "zh"));
    for (const l of enLenses) {
      const p = l.pricing?.global?.new?.find((e) => e.price != null)?.price;
      expect(p).toBeLessThan(200);
    }
    for (const l of zhLenses) {
      const p = l.pricing?.cn?.new?.find((e) => e.price != null)?.price;
      expect(p).toBeLessThan(1000);
    }
  });
});

// ---------------------------------------------------------------------------
// Chinese-brand value collections (manual side split by character/value)
// ---------------------------------------------------------------------------
const CHINESE_BRANDS = ["viltrox", "7artisans", "ttartisan", "brightinstar", "sgimage", "laowa"];

describe("Chinese manual-focus collections", () => {
  it("chinese-mf-fast matches manual primes with aperture in (0.95, 1.4]", () => {
    const lenses = matchingLenses("chinese-mf-fast");
    expect(lenses.length).toBeGreaterThan(0);
    for (const l of lenses) {
      expect(CHINESE_BRANDS).toContain(l.brand);
      expect(l.af).toBe(false);
      expect(isZoom(l)).toBe(false);
      const ap = Array.isArray(l.maxAperture) ? l.maxAperture[0] : l.maxAperture;
      expect(ap).toBeGreaterThan(0.95);
      expect(ap).toBeLessThanOrEqual(1.4);
    }
  });

  it("chinese-mf-budget is locale-aware (zh < ¥500, en < $100) and matches in both", () => {
    const col = COLLECTIONS["chinese-mf-budget"];
    if (!col) {
      throw new Error("chinese-mf-budget missing");
    }
    const enLenses = allLenses.filter((l) => col.filter(l, "en"));
    const zhLenses = allLenses.filter((l) => col.filter(l, "zh"));
    expect(enLenses.length).toBeGreaterThan(0);
    expect(zhLenses.length).toBeGreaterThan(0);
    for (const l of enLenses) {
      expect(l.af).toBe(false);
      const p = l.pricing?.global?.new?.find((e) => e.price != null)?.price;
      expect(p).toBeLessThan(100);
    }
    for (const l of zhLenses) {
      expect(l.af).toBe(false);
      const p = l.pricing?.cn?.new?.find((e) => e.price != null)?.price;
      expect(p).toBeLessThan(500);
    }
  });

  it("chinese-mf-095 stays the f/0.95 tier, distinct from chinese-mf-fast", () => {
    const dream = matchingLenses("chinese-mf-095");
    const fast = new Set(matchingLenses("chinese-mf-fast").map((l) => l.id));
    expect(dream.length).toBeGreaterThan(0);
    for (const l of dream) {
      const ap = Array.isArray(l.maxAperture) ? l.maxAperture[0] : l.maxAperture;
      expect(ap).toBeLessThanOrEqual(0.95);
      expect(fast.has(l.id)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// getRelatedCollections
// ---------------------------------------------------------------------------
describe("getRelatedCollections", () => {
  it("returns empty for unknown slug", () => {
    expect(getRelatedCollections("nonexistent", allLenses, "en")).toEqual([]);
  });

  it("excludes the current collection from results", () => {
    const slug = Object.keys(COLLECTIONS)[0];
    const related = getRelatedCollections(slug, allLenses, "en");
    expect(related.every((c) => c.slug !== slug)).toBe(true);
  });

  it("respects the limit parameter", () => {
    const slug = Object.keys(COLLECTIONS)[0];
    const related = getRelatedCollections(slug, allLenses, "en", 2);
    expect(related.length).toBeLessThanOrEqual(2);
  });

  it("returns results sorted by overlap (descending)", () => {
    const slug = Object.keys(COLLECTIONS)[0];
    const col = COLLECTIONS[slug];
    const currentSet = new Set(allLenses.filter((l) => col.filter(l, "en")).map((l) => l.id));
    const related = getRelatedCollections(slug, allLenses, "en", 10);
    const overlaps = related.map((c) => {
      let count = 0;
      for (const l of allLenses) {
        if (currentSet.has(l.id) && c.filter(l, "en")) {
          count++;
        }
      }
      return count;
    });
    for (let i = 1; i < overlaps.length; i++) {
      expect(overlaps[i]).toBeLessThanOrEqual(overlaps[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// getCollectionStats
// ---------------------------------------------------------------------------
describe("getCollectionStats", () => {
  it("returns null for unknown slug", () => {
    expect(getCollectionStats("nonexistent", xLenses, "en")).toBeNull();
  });

  it("returns valid stats for a known collection", () => {
    const slug = Object.keys(COLLECTIONS)[0];
    const stats = getCollectionStats(slug, xLenses, "en");
    expect(stats).not.toBeNull();
    expect(stats!.lensCount).toBeGreaterThan(0);
    expect(stats!.brandCount).toBeGreaterThan(0);
    expect(stats!.lenses.length).toBe(stats!.lensCount);
  });
});

// ---------------------------------------------------------------------------
// getSharedCollections
// ---------------------------------------------------------------------------
describe("getSharedCollections", () => {
  it("returns empty for empty lens list", () => {
    expect(getSharedCollections([], xLenses, "en")).toEqual([]);
  });

  it("returns member collections for single lens", () => {
    const lens = xPhotoLenses[0];
    const result = getSharedCollections([lens], xLenses, "en");
    expect(result.length).toBeGreaterThan(0);
    for (const col of result) {
      expect(col.filter(lens, "en")).toBe(true);
    }
  });

  it("returns only collections that contain ALL provided lenses", () => {
    const lens1 = xPhotoLenses[0];
    const lens2 = xPhotoLenses[1];
    if (!lens1 || !lens2) {
      return;
    }
    const shared = getSharedCollections([lens1, lens2], xLenses, "en");
    for (const col of shared) {
      expect(col.filter(lens1, "en")).toBe(true);
      expect(col.filter(lens2, "en")).toBe(true);
    }
  });
});
