import type { ChartLens } from "@/lib/charts/catalog";
import { lineupLenses, type Lineup } from "@/lib/charts/lineup";
import type { Timeline } from "@/lib/charts/timeline";

/** One line of a chart's list: a lens and what the line shows beside its model. */
export interface ChartListLine {
  lens: ChartLens;
  /** Whether the brand precedes the model: when the group is not already a single brand. */
  showBrand: boolean;
  /** The release year after the model: when the group is not already a year. */
  year?: number;
}

export interface ChartListGroup {
  /** A year or a brand slug: what the chart groups by. */
  key: string;
  lines: ChartListLine[];
}

/** The timeline's lenses by release year, newest year first; within a year, by chart brand order, then focal length. */
export function timelineListGroups(timeline: Timeline): ChartListGroup[] {
  const brandRank = new Map(timeline.brands.map(({ brand }, index) => [brand, index]));
  const byYear = new Map<number, Timeline["entries"]>();
  for (const entry of timeline.entries) {
    byYear.set(entry.year, [...(byYear.get(entry.year) ?? []), entry]);
  }
  return [...byYear]
    .sort(([a], [b]) => b - a)
    .map(([year, entries]) => ({
      key: String(year),
      lines: [...entries]
        .sort((a, b) =>
          (brandRank.get(a.lens.brand) ?? Infinity) - (brandRank.get(b.lens.brand) ?? Infinity)
          || a.focalMid - b.focalMid
          || a.lens.id.localeCompare(b.lens.id))
        .map(({ lens }) => ({ lens, showBrand: true })),
    }));
}

/** Each lineup's lenses in the chart's order, with the release year where the lens has one. */
export function lineupListGroups(lineups: Lineup[]): ChartListGroup[] {
  return lineups.map((lineup) => ({
    key: lineup.brand,
    lines: lineupLenses(lineup).map((lens) => ({ lens, showBrand: false, year: lens.releaseYear })),
  }));
}
