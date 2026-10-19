import { describe, expect, it } from "vitest";
import { pickStarters, seededRandom, type StarterPools } from "../starter-questions";

const pools: StarterPools = {
  need: ["need-1", "need-2", "need-3"],
  compare: ["compare-1", "compare-2"],
  favorites: ["favorites-1"],
  gearUnknown: ["gear-unknown"],
  gearKnown: ["gear-known-1", "gear-known-2"],
  table: ["table-1"],
  terms: ["terms-1", "terms-2"],
  about: ["about-1"],
};
const guest = { hasGear: false, hasFavorites: false };

describe("pickStarters", () => {
  it("draws two need questions and one from every other pool", () => {
    const picked = pickStarters(pools, guest, seededRandom(1), { compact: false }).map((s) => s.text);

    expect(picked).toHaveLength(7);
    expect(picked.filter((q) => q.startsWith("need"))).toHaveLength(2);
    for (const pool of ["compare", "gear-unknown", "table", "terms", "about"]) {
      expect(picked.filter((q) => q.startsWith(pool))).toHaveLength(1);
    }
  });

  it("asks about the user's gear and favorites once it knows them", () => {
    const picked = pickStarters(pools, { hasGear: true, hasFavorites: true }, seededRandom(2), { compact: false }).map((s) => s.text);

    expect(picked).toContain("favorites-1");
    expect(picked.some((q) => q.startsWith("gear-known"))).toBe(true);
    expect(picked.some((q) => q.startsWith("compare") || q === "gear-unknown")).toBe(false);
  });

  it("keeps three for narrow places, one of them a need question", () => {
    const picked = pickStarters(pools, guest, seededRandom(3), { compact: true }).map((s) => s.text);

    expect(picked).toHaveLength(3);
    expect(picked[0]).toMatch(/^need/);
    expect(new Set(picked).size).toBe(3);
  });

  it("tags each question with the pool it came from", () => {
    const picked = pickStarters(pools, { hasGear: true, hasFavorites: false }, seededRandom(4), { compact: false });

    for (const starter of picked) {
      expect(pools[starter.pool]).toContain(starter.text);
    }
    expect(picked.map((s) => s.pool).sort()).toEqual(["about", "compare", "gearKnown", "need", "need", "table", "terms"]);
  });

  it("draws the same questions from the same seed", () => {
    const draw = (seed: number) => pickStarters(pools, guest, seededRandom(seed), { compact: false });

    expect(draw(42)).toEqual(draw(42));
  });
});
