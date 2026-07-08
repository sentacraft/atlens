import { describe, it, expect } from "vitest";
import { recallLenses, type LensConstraints, type ResolvedLens } from "../recall";

// Component-level eval for the recall layer — the engine behind the queryLenses tool.
// recallLenses is a pure, deterministic function over the static lens catalogue (no LLM),
// so recall, precision, and truncation behaviour can be asserted directly against ground
// truth in CI, without a DeepSeek call or a judge.
//
// Ground truth without hand-labelling: recallLenses' own maxCount is the seam. A call with
// maxCount = ALL returns the complete match set M (evaluate() is the deterministic oracle);
// a call with maxCount = RECALL_LIMIT returns what the model actually receives. recall@N and
// truncation loss are then M vs the capped set — no re-implementation of the filter to drift.

const MOUNT = "X" as const;
const LOCALE = "en";
const RECALL_LIMIT = 20; // mirrors tools.ts — what the model receives per queryLenses call
const ALL = Number.POSITIVE_INFINITY; // uncapped: the full ground-truth match set
const TOL = 0.1; // FOCAL_MATCH_TOLERANCE in recall.ts — coversFocals is matched within this
const tBrand = (brand: string) => brand; // brand translation isn't under test

function recall(constraints: LensConstraints, maxCount: number) {
  return recallLenses(MOUNT, LOCALE, constraints, tBrand, maxCount);
}
const idsOf = (lenses: ResolvedLens[]) => lenses.map((l) => l.id);
const wideAperture = (a: ResolvedLens["maxAperture"]): number | null =>
  a == null ? null : Array.isArray(a) ? a[0] : a;
// Mirrors evaluate()'s coversFocals predicate: the point sits inside the lens's native
// focal range, widened by the tolerance at both ends.
const coversNative = (lens: ResolvedLens, point: number) => {
  const [min, max] = lens.focalNativeMm;
  return min * (1 - TOL) <= point && point <= max * (1 + TOL);
};

describe("recallLenses · filter correctness (precision / recall on labelled queries)", () => {
  it("fast portrait primes: prime, covers 56mm native, wide aperture <= f/1.4", () => {
    const c: LensConstraints = { type: "prime", coversFocals: [56], maxApertureF: { wide: 1.4 } };
    const { matches } = recall(c, ALL);
    const ids = idsOf(matches);

    // must-include: the canonical 56mm portrait primes across brands
    expect(ids).toContain("fujifilm-xf-56mmf12-r-x");
    expect(ids).toContain("viltrox-af-56mm-f14-x");
    expect(ids).toContain("sigma-contemporary-56mm-f14-dc-dn-x");

    // must-exclude: a 56mm prime a hair too slow (f/1.7), and a telephoto zoom
    expect(ids).not.toContain("viltrox-af-56mm-f17-air-x");
    expect(ids).not.toContain("fujifilm-xf-70-300mmf4-56-r-lm-ois-wr-x");

    // precision: every returned lens genuinely satisfies the query
    for (const lens of matches) {
      const [min, max] = lens.focalNativeMm;
      expect(min).toBe(max); // prime
      expect(coversNative(lens, 56)).toBe(true);
      expect(wideAperture(lens.maxAperture)).not.toBeNull();
      expect(wideAperture(lens.maxAperture) as number).toBeLessThanOrEqual(1.4);
    }
  });

  it("telephoto zooms reaching 300mm native: includes the long Fuji zooms, excludes primes", () => {
    const c: LensConstraints = { type: "zoom", coversFocals: [300] };
    const { matches } = recall(c, ALL);
    const ids = idsOf(matches);

    expect(ids).toContain("fujifilm-xf-70-300mmf4-56-r-lm-ois-wr-x");
    expect(ids).toContain("fujifilm-xf-100-400mmf45-56-r-lm-ois-wr-x");
    expect(ids).toContain("fujifilm-xf-150-600mmf56-8-r-lm-ois-wr-x");
    expect(ids).not.toContain("fujifilm-xf-56mmf12-r-x"); // a prime

    for (const lens of matches) {
      const [min, max] = lens.focalNativeMm;
      expect(min).not.toBe(max); // zoom
      expect(coversNative(lens, 300)).toBe(true);
    }
  });

  it("compact & light primes under 200g: every returned lens obeys the weight bound", () => {
    const c: LensConstraints = { type: "prime", maxWeightG: 200 };
    const { matches } = recall(c, ALL);

    expect(matches.length).toBeGreaterThan(0);
    expect(idsOf(matches)).toContain("viltrox-af-56mm-f17-air-x"); // a known 171g prime
    for (const lens of matches) {
      // maxWeightG demotes missing-weight lenses to `maybe`, so every match has a weight.
      expect(lens.weightG).not.toBeNull();
      expect(lens.weightG as number).toBeLessThanOrEqual(200);
    }
  });
});

describe("recallLenses · truncation (the wideEnd-bias validation vehicle)", () => {
  // "Show me zooms" over-matches (35 zooms > RECALL_LIMIT). The default sort is wideEnd
  // ascending, so the cap keeps the 20 widest zooms and silently drops the most telephoto
  // ones — regardless of what the user actually wanted.
  const zooms: LensConstraints = { type: "zoom" };

  it("caps at RECALL_LIMIT while reporting the honest full match count", () => {
    const full = recall(zooms, ALL);
    const capped = recall(zooms, RECALL_LIMIT);

    expect(full.totalMatched).toBeGreaterThan(RECALL_LIMIT); // truncation is actually active
    expect(capped.matches.length).toBe(RECALL_LIMIT);
    expect(capped.totalMatched).toBe(full.totalMatched); // count stays honest under the cap
    // the capped set is exactly the top slice of the full set — nothing conjured, only dropped
    expect(idsOf(capped.matches)).toEqual(idsOf(full.matches).slice(0, RECALL_LIMIT));
  });

  it("recall@20 < 1: the cap drops real matches", () => {
    const full = recall(zooms, ALL);
    const capped = recall(zooms, RECALL_LIMIT);
    expect(capped.matches.length / full.totalMatched).toBeLessThan(1);
  });

  it("documents the directional bias: a genuine telephoto match is dropped by the wide-first cap", () => {
    // This lens is a true match (a zoom) sitting at the tele extreme — widest focal 150mm
    // native = 225mm-equiv, the largest wideEnd among zooms — so the wideEnd-asc sort ranks
    // it last and the cap removes it. For a user asking about reach, the single most relevant
    // lens is the one that disappears: the bug the truncation-bias task fixes. When the cap is
    // made intent-aware, this expectation flips (the tele lens should be kept) — update it then.
    const tele = "fujifilm-xf-150-600mmf56-8-r-lm-ois-wr-x";
    expect(idsOf(recall(zooms, ALL).matches)).toContain(tele); // it IS a match
    expect(idsOf(recall(zooms, RECALL_LIMIT).matches)).not.toContain(tele); // but the cap drops it
  });
});
