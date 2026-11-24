import type { ApertureValue, LensImageAsset } from "@/lib/types";

export interface MtfChart {
  lensRef: string;
  /** The lens's maximum aperture; a pair for a zoom whose maximum aperture changes with focal length. */
  maxAperture: ApertureValue | null;
  /** Whether the lens zooms, so an unstated chart focal length matters. */
  zoom?: boolean;
  image: LensImageAsset;
  /** How the model names this chart: its figure label in this reply, or its imageRef for an earlier reply. */
  name: string;
}

type Level = "values" | "values-with-caveats" | "alone";

export interface MtfLensGroup {
  lenses: { lens: string; charts: string[] }[];
  level: Level;
  caveats: string[];
  rule: string;
}

export interface MtfGrouping {
  mtfGroups: MtfLensGroup[];
  /** Present when the lenses fall into more than one group. */
  betweenGroups?: string;
}

const RULES: Record<Level, string> = {
  values: "The chart conditions match, so chart values can be compared directly.",
  "values-with-caveats": "Compare values and give a leaning, but state every caveat and never call the conditions identical.",
  alone: "No other shown lens shares this chart scale; compare it with the others by curve shape only.",
};

const fNumber = (value: number) => `f/${value}`;
const maxApertureLabel = (value: ApertureValue | null) =>
  value === null ? "unknown" : Array.isArray(value) ? `${fNumber(value[0])}–${fNumber(value[1])}` : fNumber(value);

interface LensFacts {
  lens: string;
  charts: MtfChart[];
  frequency: string | null;
  methods: string[];
  aperture: string | null;
  focal: string | null;
}

// The values a lens's charts state, as one sorted label; null when any of its charts is silent.
function stated(charts: MtfChart[], pick: (image: LensImageAsset) => string[] | undefined): string | null {
  const labels = new Set<string>();
  for (const { image } of charts) {
    const own = pick(image);
    if (!own?.length) {return null;}
    own.forEach((label) => labels.add(label));
  }
  return [...labels].sort().join(", ");
}

function factsFor(charts: MtfChart[]): LensFacts[] {
  const byLens = new Map<string, MtfChart[]>();
  for (const chart of charts) {byLens.set(chart.lensRef, [...(byLens.get(chart.lensRef) ?? []), chart]);}
  return [...byLens].map(([lens, own]) => ({
    lens,
    charts: own,
    frequency: stated(own, ({ spatialFrequency }) => spatialFrequency && [`${spatialFrequency.values.join("/")} ${spatialFrequency.unit}`]),
    methods: [...new Set(own.flatMap(({ image }) => image.mtfMethod ? [image.mtfMethod] : []))],
    aperture: stated(own, ({ apertureFNumbers }) => apertureFNumbers?.map(fNumber)),
    // A prime's single focal length needs no statement on the chart.
    focal: own[0].zoom ? stated(own, ({ focalLengthMm }) => focalLengthMm === undefined ? undefined : [`${focalLengthMm}mm`]) : "prime",
  }));
}

const methodsConflict = (a: string[], b: string[]) => a.length > 0 && b.length > 0 && !a.some((method) => b.includes(method));

// Lenses share a group when their stated spatial frequencies match and no stated MTF method conflicts;
// a lens that states no frequency has no known scale and stands alone.
function partition(facts: LensFacts[]): LensFacts[][] {
  const groups: LensFacts[][] = [];
  for (const lens of facts) {
    const home = lens.frequency === null ? undefined : groups.find((group) =>
      group[0].frequency === lens.frequency && group.every((member) => !methodsConflict(member.methods, lens.methods)));
    if (home) {home.push(lens);} else {groups.push([lens]);}
  }
  return groups;
}

function describeGroup(group: LensFacts[]): MtfLensGroup {
  const lenses = group.map(({ lens, charts }) => ({ lens, charts: charts.map(({ name }) => name) }));
  if (group.length === 1) {return { lenses, level: "alone", caveats: [], rule: RULES.alone };}

  const caveats: string[] = [];
  const apertures = group.map(({ aperture }) => aperture);
  if (apertures.some((value) => value === null)) {
    const wide = group.map(({ charts }) => maxApertureLabel(charts[0].maxAperture));
    caveats.push(`The test aperture is not stated on every chart. If they were measured wide open (a common manufacturer convention, an assumption, not a fact), they sit at each lens's maximum aperture: ${wide.join(" vs ")}.`);
  } else if (new Set(apertures).size > 1) {
    caveats.push(`The charts were measured at different test apertures (${apertures.join(" vs ")}).`);
  }
  const focals = group.map(({ focal }) => focal);
  if (focals.some((value) => value === null) || new Set(focals).size > 1) {
    caveats.push(`The chart focal length ${focals.some((value) => value === null) ? "is not stated for a zoom" : "differs between the lenses"}; a conditions note such as "Wide-angle end" may describe it.`);
  }
  const level: Level = caveats.length ? "values-with-caveats" : "values";
  return { lenses, level, caveats, rule: RULES[level] };
}

function scaleOf(group: LensFacts[]): string {
  return group[0].frequency ?? "frequency not stated";
}

/**
 * Groups the lenses of the given MTF charts by comparable test conditions and grades each group.
 * Undefined unless the charts cover at least two lenses.
 */
export function groupMtfCharts(charts: MtfChart[]): MtfGrouping | undefined {
  const facts = factsFor(charts);
  if (facts.length < 2) {return undefined;}
  const groups = partition(facts);
  return {
    mtfGroups: groups.map(describeGroup),
    ...(groups.length > 1 ? {
      betweenGroups: `Lenses in different groups sit on different or unknown chart scales (${groups.map(scaleOf).join(" vs ")}): compare them only by curve shape (centre-to-edge falloff, S/M separation), not values, and say what prevents it.`,
    } : {}),
  };
}
