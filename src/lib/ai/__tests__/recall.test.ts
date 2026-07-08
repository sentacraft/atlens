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

describe("recallLenses · truncation under the no-sortBy default", () => {
  // "Show me zooms" over-matches (35 zooms > RECALL_LIMIT). With no sortBy the default is
  // wideEnd-ascending, so in isolation the cap keeps the 20 widest zooms and drops the most
  // telephoto ones. These tests pin that mechanical behaviour; the note on the last one covers
  // why it isn't a live user-facing bug.
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

  it("no-sortBy default drops the tele extreme — pinned, but not a live bug", () => {
    // Called with no sortBy, the wideEnd-asc default ranks this true match (a zoom at the tele
    // extreme: 150mm native = 225mm-equiv, the largest wideEnd among zooms) last, so the cap
    // removes it. That is a directional bias of the recall function in isolation — but NOT a live
    // failure: over real turns the model always supplies its own sortBy (a reach need -> reach desc,
    // which surfaces exactly this lens), so this default path isn't exercised. The guard against a
    // future model that stops sorting is a behavioural eval (backlog), not an intent-aware cap here
    // — so this stays a characterization, not a test awaiting a recall-layer fix.
    const tele = "fujifilm-xf-150-600mmf56-8-r-lm-ois-wr-x";
    expect(idsOf(recall(zooms, ALL).matches)).toContain(tele); // it IS a match
    expect(idsOf(recall(zooms, RECALL_LIMIT).matches)).not.toContain(tele); // the no-sortBy cap drops it
  });
});
