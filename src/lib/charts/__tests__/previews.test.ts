import { describe, expect, it } from "vitest";
import { getLensesByMount } from "@/lib/lens/data";
import { buildLineup } from "../lineup";
import { buildChartPreviews, PREVIEW_LINEUP_BRAND } from "../previews";
import { buildTimeline } from "../timeline";
import { buildWeightLadder } from "../weight";

const lenses = getLensesByMount("X", "en");
const previews = buildChartPreviews(lenses)!;

describe("buildChartPreviews", () => {
  it("draws every dated lens on the timeline, as the timeline chart does", () => {
    const timeline = buildTimeline(lenses);
    expect(previews.timeline.count).toBe(timeline.entries.length);
    expect(previews.timeline.marks).toHaveLength(timeline.entries.length);
    expect(previews.timeline.first).toBe(timeline.years[0].year);
    expect(previews.timeline.last).toBe(timeline.years.at(-1)!.year);
  });

  it("samples the weight ladder from its heaviest lens down to its lightest", () => {
    const ladder = buildWeightLadder(lenses);
    expect(previews.weight.count).toBe(ladder.count);
    expect(previews.weight.sampleG[0]).toBe(ladder.heaviest!.weightG);
    expect(previews.weight.sampleG.at(-1)).toBe(ladder.lightest!.weightG);
    expect(previews.weight.sampleG).toEqual([...previews.weight.sampleG].sort((a, b) => b - a));
  });

  it("takes one brand's lineup, primes stacked by focal length and zooms as spans", () => {
    const lineup = buildLineup(lenses, PREVIEW_LINEUP_BRAND)!;
    expect(previews.lineup.primes.reduce((n, column) => n + column.count, 0)).toBe(lineup.count - lineup.zooms.length);
    expect(previews.lineup.zooms).toHaveLength(lineup.zooms.length);
    expect(previews.lineup.zooms.every((zoom) => zoom.focalMax > zoom.focalMin)).toBe(true);
  });

  it("gives no previews for a catalogue with nothing to chart", () => {
    expect(buildChartPreviews([])).toBeUndefined();
  });
});
