import type { ApertureValue, LensImageAsset } from "@/lib/types";

export interface MtfChart {
  lensRef: string;
  /** The lens's maximum aperture; a pair for a zoom whose maximum aperture changes with focal length. */
  maxAperture: ApertureValue | null;
  /** Whether the lens zooms, so an unstated chart focal length matters. */
  zoom?: boolean;
  image: LensImageAsset;
}

type Condition = "spatialFrequency" | "testAperture" | "focalLength" | "mtfMethod";
type Status = "same" | "differs" | "unstated";
type Level = "values" | "values-with-caveats" | "shape-only";

export interface MtfComparison {
  level: Level;
  conditions: { condition: Condition; status: Status; values: Record<string, string | null> }[];
  caveats: string[];
  rule: string;
}

const RULES: Record<Level, string> = {
  values: "The chart conditions match, so chart values can be compared directly.",
  "values-with-caveats": "Compare values and give a leaning, but state every caveat and never call the conditions identical.",
  "shape-only": "Compare only curve shapes (centre-to-edge falloff, S/M separation), not values, and say which condition prevents it.",
};

const fNumber = (value: number) => `f/${value}`;
const maxApertureLabel = (value: ApertureValue | null) =>
  value === null ? "unknown" : Array.isArray(value) ? `${fNumber(value[0])}–${fNumber(value[1])}` : fNumber(value);

// Per lens, the set of values its read charts state, as a sorted list of labels; null when any chart is silent.
function labelsByLens(charts: MtfChart[], pick: (image: LensImageAsset) => string[] | undefined) {
  const byLens = new Map<string, string[] | null>();
  for (const { lensRef, image } of charts) {
    const labels = pick(image);
    const current = byLens.get(lensRef);
    if (current === null || (current === undefined && byLens.has(lensRef))) {continue;}
    if (!labels?.length) {
      byLens.set(lensRef, null);
    } else {
      byLens.set(lensRef, [...new Set([...(current ?? []), ...labels])].sort());
    }
  }
  return byLens;
}

function classify(byLens: Map<string, string[] | null>, ignoreUnstated = false) {
  const entries = [...byLens.entries()];
  const values = Object.fromEntries(entries.map(([ref, labels]) => [ref, labels?.join(", ") ?? null]));
  const stated = entries.filter(([, labels]) => labels !== null);
  const unstated = stated.length < entries.length;
  const differs = new Set(stated.map(([, labels]) => labels!.join("|"))).size > 1;
  const status: Status = differs ? "differs" : unstated && !ignoreUnstated ? "unstated" : "same";
  return { status, values };
}

/** Grades how far MTF charts read this turn can be compared; undefined unless they cover at least two lenses. */
export function compareMtfCharts(charts: MtfChart[]): MtfComparison | undefined {
  if (new Set(charts.map(({ lensRef }) => lensRef)).size < 2) {return undefined;}

  const frequency = classify(labelsByLens(charts, ({ spatialFrequency }) =>
    spatialFrequency && [`${spatialFrequency.values.join("/")} ${spatialFrequency.unit}`]));
  const aperture = classify(labelsByLens(charts, ({ apertureFNumbers }) => apertureFNumbers?.map(fNumber)));
  const focalByLens = labelsByLens(charts, ({ focalLengthMm }) => focalLengthMm === undefined ? undefined : [`${focalLengthMm}mm`]);
  for (const { lensRef, zoom } of charts) {
    // A prime's single focal length needs no statement on the chart.
    if (!zoom) {focalByLens.set(lensRef, focalByLens.get(lensRef) ?? ["prime"]);}
  }
  const focal = classify(focalByLens);
  const method = classify(labelsByLens(charts, ({ mtfMethod }) => mtfMethod && [mtfMethod]), true);

  const conditions: MtfComparison["conditions"] = [
    { condition: "spatialFrequency", ...frequency },
    { condition: "testAperture", ...aperture },
    { condition: "focalLength", ...focal },
    { condition: "mtfMethod", ...method },
  ];

  const caveats: string[] = [];
  const hard = frequency.status !== "same" || method.status === "differs";
  if (frequency.status !== "same") {
    caveats.push(`The charts' spatial frequencies ${frequency.status === "differs" ? "differ" : "are not all stated"}, so their values are on different or unknown scales.`);
  }
  if (method.status === "differs") {
    caveats.push("The charts use different MTF calculation methods, so their values are not on the same footing.");
  }
  if (aperture.status === "unstated") {
    const wide = [...new Set(charts.map(({ lensRef }) => lensRef))]
      .map((ref) => maxApertureLabel(charts.find((chart) => chart.lensRef === ref)!.maxAperture));
    caveats.push(`The test aperture is not stated on every chart. If they were measured wide open (a common manufacturer convention, an assumption, not a fact), they sit at each lens's maximum aperture: ${wide.join(" vs ")}.`);
  } else if (aperture.status === "differs") {
    caveats.push(`The charts were measured at different test apertures (${Object.values(aperture.values).join(" vs ")}).`);
  }
  if (focal.status !== "same") {
    caveats.push(`The chart focal length ${focal.status === "differs" ? "differs between the lenses" : "is not stated for a zoom"}; a conditions note such as "Wide-angle end" may describe it.`);
  }

  const level: Level = hard ? "shape-only" : caveats.length ? "values-with-caveats" : "values";
  return { level, conditions, caveats, rule: RULES[level] };
}
