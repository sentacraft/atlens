import { describe, expect, it } from "vitest";
import { formatDataDate } from "../data-date";
import type { Lens } from "@/lib/types";
import { getLensesByMount } from "@/lib/lens/data";
import { assignLanes, buildTimeline, fitItemSize } from "@/lib/charts/timeline";
import { buildWeightLadder, rankedRows, weightBarPct } from "@/lib/charts/weight";
import { buildLineup } from "@/lib/charts/lineup";
import { chartBrands, matchesChartSelection, toChartLens, type ChartLens } from "@/lib/charts/catalog";

function makeLens(overrides: Partial<Lens> = {}): Lens {
  return {
    id: "test-lens",
    brand: "fujifilm",
    mount: "X",
    model: "Test Lens",
    officialLinks: {},
    focalLengthMin: 35,
    focalLengthMax: 35,
    maxAperture: 2,
    minAperture: 16,
    af: true,
    ois: false,
    wr: false,
    apertureRing: false,
    powerZoom: false,
    internalZoom: false,
    weightG: 170,
    diameterMm: 60,
    length: { mm: 46 },
    angleOfViewCalc: 44,
    searchAliases: { store: { en: "Test Lens" }, review: { en: "Test Lens" } },
    ...overrides,
  };
}

const ids = (lenses: ChartLens[]) => lenses.map((lens) => lens.id);
const xLenses = getLensesByMount("X", "en");

describe("buildTimeline", () => {
  it("keeps dated stills lenses and lists brands that have no dated lens", () => {
    const timeline = buildTimeline([
      makeLens({ id: "a", releaseYear: 2014 }),
      makeLens({ id: "b", releaseYear: 2012, brand: "sigma" }),
      makeLens({ id: "cine", releaseYear: 2013, isCine: true }),
      makeLens({ id: "undated", brand: "viltrox" }),
    ]);
    expect(timeline.entries.map((e) => e.lens.id)).toEqual(["b", "a"]);
    expect(timeline.brandsWithoutYear).toEqual(["viltrox"]);
  });

  it("lists every year in the span, empty years included", () => {
    const timeline = buildTimeline([
      makeLens({ id: "a", releaseYear: 2012 }),
      makeLens({ id: "b", releaseYear: 2014 }),
    ]);
    expect(timeline.years.map(({ year, count }) => [year, count])).toEqual([
      [2012, 1],
      [2013, 0],
      [2014, 1],
    ]);
  });


  it("places a zoom at the geometric middle of its focal range", () => {
    const [entry] = buildTimeline([makeLens({ focalLengthMin: 10, focalLengthMax: 40, releaseYear: 2020 })]).entries;
    expect(entry.focalMid).toBe(20);
  });
});

describe("assignLanes", () => {
  it("opens a new lane only when every lane already has a neighbour too close", () => {
    expect(assignLanes([0, 10, 50, 55, 58], (p) => p, 20)).toEqual([0, 1, 0, 1, 2]);
  });
});

describe("fitItemSize", () => {
  const bounds = { min: 40, max: 88 };

  it("takes the largest size when lenses sit far apart", () => {
    expect(fitItemSize([[100], [50, 300], [400]], 370, bounds)).toBe(88);
  });

  it("shrinks when one year's lenses crowd into side-by-side lanes", () => {
    const size = fitItemSize([[100, 110, 120, 300]], 224, bounds);
    expect(size).toBeLessThan(88);
    expect(size).toBeGreaterThan(40);
  });

  it("stops at the minimum on narrow columns", () => {
    expect(fitItemSize([[100, 105, 110, 115, 120]], 75, bounds)).toBe(40);
  });
});

describe("buildWeightLadder", () => {
  it("sorts heaviest first and puts each weight in exactly one tier", () => {
    const ladder = buildWeightLadder([
      makeLens({ id: "w150", weightG: 150 }),
      makeLens({ id: "w1000", weightG: 1000 }),
      makeLens({ id: "w999", weightG: 999 }),
      makeLens({ id: "w58", weightG: 58 }),
    ]);
    const byTier = Object.fromEntries(ladder.tiers.map((t) => [t.key, ids(t.lenses)]));
    expect(byTier).toEqual({ cannon: ["w1000"], heavy: ["w999"], everyday: [], light: ["w150"], pocket: ["w58"] });
    expect(ladder.heaviest?.id).toBe("w1000");
    expect(ladder.lightest?.id).toBe("w58");
    expect(ladder.ratio).toBe(17);
  });

  it("uses the midpoint of a weight range", () => {
    const ladder = buildWeightLadder([makeLens({ weightG: [480, 520] })]);
    expect(ladder.tiers.find((t) => t.key === "heavy")?.lenses[0].weightG).toBe(500);
  });

  it("ranks lenses across tiers and sets each reference after the last lens at least as heavy", () => {
    const ladder = buildWeightLadder([
      makeLens({ id: "w600", weightG: 600 }),
      makeLens({ id: "w520", weightG: 520 }),
      makeLens({ id: "w510", weightG: 510 }),
      makeLens({ id: "w58", weightG: 58 }),
    ]);
    const rows = (key: string) =>
      ladder.tiers.find((t) => t.key === key)?.rows.map((r) => (r.kind === "lens" ? `${r.lens.id}#${r.rank}` : r.reference.key));
    expect(rows("heavy")).toEqual(["water750", "w600#1", "w520#2", "water500", "w510#3"]);
    expect(rows("pocket")).toEqual(["soap", "w58#4", "egg"]);
  });

  it("keeps lenses of equal weight in rank order", () => {
    const ladder = buildWeightLadder(["e", "d", "c", "b", "a"].map((id) => makeLens({ id, weightG: 490 })));
    const ranks = ladder.tiers.find((t) => t.key === "everyday")?.rows.flatMap((r) => (r.kind === "lens" ? [r.rank] : []));
    expect(ranks).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("rankedRows", () => {
  it("ranks within the set and brings only the references its weights reach, plus one below", () => {
    const rows = rankedRows([
      makeLens({ id: "w380", weightG: 380 }),
      makeLens({ id: "w180", weightG: 180 }),
      makeLens({ id: "cine", weightG: 900, isCine: true }),
    ]);
    expect(rows.map((r) => (r.kind === "lens" ? `${r.lens.id}#${r.rank}` : r.reference.key))).toEqual([
      "w380#1",
      "colaCan",
      "milk250",
      "apple",
      "w180#2",
      "banana",
    ]);
  });
});

describe("toChartLens", () => {
  it("keeps the focal length the lens name gives, with its full-frame equivalent beside it", () => {
    const lens = toChartLens(makeLens({ focalLengthMin: 10, focalLengthMax: 24 }));
    expect([lens.focalMin, lens.focalMax]).toEqual([10, 24]);
    expect([lens.focalEquivMin, lens.focalEquivMax]).toEqual([15, 36]);
  });

  // Same rule as the browse filter, on unrounded equivalents: 23mm is 34.5mm, so wide, not standard.
  it("assigns focal categories the way the browse filter does", () => {
    expect(toChartLens(makeLens({ focalLengthMin: 23, focalLengthMax: 23 })).focalCategories).toEqual(["wide"]);
    expect(toChartLens(makeLens({ focalLengthMin: 16, focalLengthMax: 55 })).focalCategories).toEqual(["wide", "standard", "mediumTele"]);
  });
});

describe("matchesChartSelection", () => {
  it("keeps every lens when no brand is set, and only that brand's when one is", () => {
    const lens = toChartLens(makeLens({ brand: "sigma" }));
    expect(matchesChartSelection(lens, {})).toBe(true);
    expect(matchesChartSelection(lens, { brand: "sigma" })).toBe(true);
    expect(matchesChartSelection(lens, { brand: "viltrox" })).toBe(false);
  });
});

describe("weightBarPct", () => {
  it("scales in proportion, keeping the lightest bar visible", () => {
    expect(weightBarPct(400, 400)).toBe(100);
    expect(weightBarPct(100, 400)).toBe(25);
    expect(weightBarPct(10, 2000)).toBe(1);
  });
});

describe("buildLineup", () => {
  it("stacks primes by focal length with the widest aperture on top", () => {
    const lineup = buildLineup(
      [
        makeLens({ id: "f2", focalLengthMin: 56, focalLengthMax: 56, maxAperture: 2 }),
        makeLens({ id: "f12", focalLengthMin: 56, focalLengthMax: 56, maxAperture: 1.2 }),
        makeLens({ id: "f14-heavy", focalLengthMin: 56, focalLengthMax: 56, maxAperture: 1.4, weightG: 400 }),
        makeLens({ id: "f14-light", focalLengthMin: 56, focalLengthMax: 56, maxAperture: 1.4, weightG: 280 }),
        makeLens({ id: "wide", focalLengthMin: 23, focalLengthMax: 23 }),
      ],
      "fujifilm",
    );
    expect(lineup?.primes.map((c) => c.focal)).toEqual([23, 56]);
    expect(ids(lineup!.primes[1].lenses)).toEqual(["f2", "f14-light", "f14-heavy", "f12"]);
  });

  it("orders zooms by where they start, then where they end", () => {
    const lineup = buildLineup(
      [
        makeLens({ id: "70-300", focalLengthMin: 70, focalLengthMax: 300 }),
        makeLens({ id: "16-80", focalLengthMin: 16, focalLengthMax: 80 }),
        makeLens({ id: "16-55", focalLengthMin: 16, focalLengthMax: 55 }),
      ],
      "fujifilm",
    );
    expect(ids(lineup!.zooms)).toEqual(["16-55", "16-80", "70-300"]);
    expect(lineup?.focalMin).toBe(16);
    expect(lineup?.focalMax).toBe(300);
  });

  it("returns nothing for a brand without stills lenses", () => {
    expect(buildLineup([makeLens({ isCine: true })], "fujifilm")).toBeUndefined();
  });
});

// The chart copy quotes these numbers; a data change that moves them should be a visible failure.
describe("X-mount catalog", () => {
  it("dates 81 lenses from 2012 to 2026 and names the seven brands with no dates", () => {
    const timeline = buildTimeline(xLenses);
    expect(timeline.entries).toHaveLength(81);
    expect([timeline.years[0].year, timeline.years.at(-1)?.year]).toEqual([2012, 2026]);
    expect(timeline.brandsWithoutYear.toSorted()).toEqual(
      ["7artisans", "brightinstar", "meike", "sgimage", "sirui", "ttartisan", "viltrox"],
    );
  });

  it("weighs 179 lenses, the heaviest 39 times the lightest", () => {
    const ladder = buildWeightLadder(xLenses);
    expect(ladder.count).toBe(179);
    expect(ladder.heaviest?.model).toBe("XF 200mm F2 R LM OIS WR");
    expect(ladder.ratio).toBe(39);
  });

  it("gives Fujifilm 28 primes and 21 zooms from 8mm to 600mm", () => {
    const lineup = buildLineup(xLenses, "fujifilm")!;
    expect(lineup.primes.flatMap((c) => c.lenses)).toHaveLength(28);
    expect(lineup.zooms).toHaveLength(21);
    expect([lineup.focalMin, lineup.focalMax]).toEqual([8, 600]);
    expect(chartBrands(xLenses)).toHaveLength(12);
  });
});

describe("formatDataDate", () => {
  it("writes the snapshot date the way each language expects", () => {
    expect(formatDataDate("2026-10-22T08:19:15.077Z", "zh")).toBe("2026-10-22");
    expect(formatDataDate("2026-10-22T08:19:15.077Z", "en")).toBe("Oct 22, 2026");
  });
});
