import { describe, expect, it } from "vitest";
import { pickStarters, seededRandom, type StarterPools } from "../starter-questions";

const pools: StarterPools = {
  need: ["need-1", "need-2", "need-3"],
  brief: ["brief-1", "brief-2"],
  compare: ["compare-1", "compare-2"],
  favorites: ["favorites-1"],
  gearUnknown: ["gear-unknown"],
  gearKnown: ["gear-known-1", "gear-known-2"],
  table: ["table-1"],
};
const guest = { hasGear: false, hasFavorites: false };

describe("pickStarters", () => {
  it("draws two scenes, a brief, a compare question, and one of gear or table", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const picked = pickStarters(pools, guest, seededRandom(seed), { compact: false }).map((s) => s.text);

      expect(picked).toHaveLength(5);
      expect(picked.filter((q) => q.startsWith("need"))).toHaveLength(2);
      expect(picked.filter((q) => q.startsWith("brief"))).toHaveLength(1);
      expect(picked.filter((q) => q.startsWith("compare"))).toHaveLength(1);
      expect(picked.filter((q) => q === "gear-unknown" || q.startsWith("table"))).toHaveLength(1);
    }
  });

  it("shows both gear and table questions across draws", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      for (const starter of pickStarters(pools, guest, seededRandom(seed), { compact: false })) {
        seen.add(starter.pool);
      }
    }

    expect(seen.has("gearUnknown")).toBe(true);
    expect(seen.has("table")).toBe(true);
  });

  it("asks about the user's gear and favorites once it knows them", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      for (const starter of pickStarters(pools, { hasGear: true, hasFavorites: true }, seededRandom(seed), { compact: false })) {
        seen.add(starter.pool);
      }
    }

    expect(seen.has("favorites")).toBe(true);
    expect(seen.has("gearKnown")).toBe(true);
    expect(seen.has("compare")).toBe(false);
    expect(seen.has("gearUnknown")).toBe(false);
  });

  it("keeps three for narrow places, one of them a scene", () => {
    const picked = pickStarters(pools, guest, seededRandom(3), { compact: true }).map((s) => s.text);

    expect(picked).toHaveLength(3);
    expect(picked[0]).toMatch(/^need/);
    expect(new Set(picked).size).toBe(3);
  });

  it("tags each question with the pool it came from", () => {
    const picked = pickStarters(pools, guest, seededRandom(4), { compact: false });

    for (const starter of picked) {
      expect(pools[starter.pool]).toContain(starter.text);
    }
  });

  it("draws the same questions from the same seed", () => {
    const draw = (seed: number) => pickStarters(pools, guest, seededRandom(seed), { compact: false });

    expect(draw(42)).toEqual(draw(42));
  });
});
