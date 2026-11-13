import { describe, expect, it } from "vitest";
import catalog from "@/data/lenses.json";
import { getLensesByMount } from "@/lib/lens/data";
import { buildChartPreviews, PREVIEW_LINEUP_BRAND } from "../previews";

const lenses = getLensesByMount("X", "en");
const previews = buildChartPreviews(lenses)!;
const stills = catalog.filter((lens) => !lens.isCine);

describe("buildChartPreviews", () => {
  it("draws every dated stills lens on the timeline", () => {
    const years = stills.flatMap((lens) => lens.releaseYear === undefined ? [] : [lens.releaseYear]);
    expect(previews.timeline.count).toBe(years.length);
    expect(previews.timeline.marks).toHaveLength(years.length);
    expect(previews.timeline.first).toBe(Math.min(...years));
    expect(previews.timeline.last).toBe(Math.max(...years));
  });

  it("samples the weight ladder from its heaviest lens down to its lightest", () => {
    const weights = stills.map(({ weightG }) => typeof weightG === "number" ? weightG : (weightG[0] + weightG[1]) / 2);
    expect(previews.weight.count).toBe(weights.length);
    expect(previews.weight.sampleG[0]).toBe(Math.max(...weights));
    expect(previews.weight.sampleG.at(-1)).toBe(Math.min(...weights));
    expect(previews.weight.sampleG).toEqual([...previews.weight.sampleG].sort((a, b) => b - a));
  });

  it("takes one brand's lineup, primes stacked by focal length and zooms as spans", () => {
    const lineup = stills.filter((lens) => lens.brand === PREVIEW_LINEUP_BRAND);
    const primes = lineup.filter((lens) => lens.focalLengthMin === lens.focalLengthMax);
    const zooms = lineup.filter((lens) => lens.focalLengthMin !== lens.focalLengthMax);
    expect(previews.lineup.primes.reduce((n, column) => n + column.count, 0)).toBe(primes.length);
    expect(previews.lineup.zooms).toHaveLength(zooms.length);
    expect(previews.lineup.zooms.every((zoom) => zoom.focalMax > zoom.focalMin)).toBe(true);
  });

  it("gives no previews for a catalogue with nothing to chart", () => {
    expect(buildChartPreviews([])).toBeUndefined();
  });
});
