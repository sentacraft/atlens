import type { Lens, OpticalTrait } from "@/lib/types";

/** Primes within this share of the current focal length count as the same focal length. */
const PRIME_FOCAL_TOLERANCE = 0.1;
/** Zooms whose shared range covers at least this share of their combined range, on a log scale. */
const ZOOM_MIN_OVERLAP = 0.6;
/** Weight differences within this share of the current lens's weight read as "close". */
const WEIGHT_CLOSE_SHARE = 0.1;
/** How many alternatives show before the list is expanded. */
export const ALTERNATIVES_SHOWN = 6;

/** Traits that make a lens a different kind of tool; alternatives must share all of them. */
const SPECIAL_TRAITS: readonly OpticalTrait[] = ["fisheye", "tilt", "shift", "probe", "anamorphic"];

export type LensKind = "prime" | "zoom";

export function lensKind(lens: Pick<Lens, "focalLengthMin" | "focalLengthMax">): LensKind {
  return lens.focalLengthMin === lens.focalLengthMax ? "prime" : "zoom";
}

function specialTraitKey(lens: Lens): string {
  return SPECIAL_TRAITS.filter((trait) => lens.opticalTraits?.includes(trait)).join(",");
}

/** Shared share of two focal ranges on a log scale: 1 for the same range, 0 when they do not overlap. */
export function zoomOverlap(a: Pick<Lens, "focalLengthMin" | "focalLengthMax">, b: Pick<Lens, "focalLengthMin" | "focalLengthMax">): number {
  const shared = Math.log(Math.min(a.focalLengthMax, b.focalLengthMax) / Math.max(a.focalLengthMin, b.focalLengthMin));
  const combined = Math.log(Math.max(a.focalLengthMax, b.focalLengthMax) / Math.min(a.focalLengthMin, b.focalLengthMin));
  return shared > 0 && combined > 0 ? shared / combined : 0;
}

/** How far a lens is from the current one, smaller is closer. */
function distance(current: Lens, other: Lens): number {
  return lensKind(current) === "prime"
    ? Math.abs(Math.log(other.focalLengthMin / current.focalLengthMin))
    : 1 - zoomOverlap(current, other);
}

function matches(current: Lens, other: Lens): boolean {
  if (other.id === current.id || other.mount !== current.mount || lensKind(other) !== lensKind(current)) {
    return false;
  }
  if ((other.isCine === true) !== (current.isCine === true) || specialTraitKey(other) !== specialTraitKey(current)) {
    return false;
  }
  return lensKind(current) === "prime"
    ? Math.abs(other.focalLengthMin / current.focalLengthMin - 1) <= PRIME_FOCAL_TOLERANCE
    : zoomOverlap(current, other) >= ZOOM_MIN_OVERLAP;
}

export function weightMid(weightG: Lens["weightG"]): number {
  return Array.isArray(weightG) ? (weightG[0] + weightG[1]) / 2 : weightG;
}

/**
 * Lenses of the same kind and focal length as `current`: primes within 10% of its focal length,
 * zooms sharing most of its range. Those focusing the same way come first, then the closest, then the lightest.
 */
export function findSameFocalAlternatives(current: Lens, lenses: readonly Lens[]): Lens[] {
  return lenses
    .filter((other) => matches(current, other))
    .map((lens) => ({ lens, sameFocus: lens.af === current.af ? 0 : 1, distance: distance(current, lens), weight: weightMid(lens.weightG) }))
    .sort((a, b) => a.sameFocus - b.sameFocus || a.distance - b.distance || a.weight - b.weight)
    .map(({ lens }) => lens);
}

export type ApertureDelta =
  | { kind: "same" }
  | { kind: "brighter" | "darker"; thirds: number }
  | { kind: "constant" };

function wideEnd(aperture: NonNullable<Lens["maxAperture"]>): number {
  return Array.isArray(aperture) ? aperture[0] : aperture;
}

/**
 * The other lens's maximum aperture against the current one's, in thirds of a stop at the wide end.
 * A constant-aperture zoom against a variable one is called out instead; null when either lens lists only T-stops.
 */
export function apertureDelta(current: Lens, other: Lens): ApertureDelta | null {
  if (current.maxAperture === undefined || other.maxAperture === undefined) {
    return null;
  }
  if (lensKind(current) === "zoom" && Array.isArray(current.maxAperture) && !Array.isArray(other.maxAperture)) {
    return { kind: "constant" };
  }
  const thirds = Math.round(6 * Math.log2(wideEnd(current.maxAperture) / wideEnd(other.maxAperture)));
  if (thirds === 0) {
    return { kind: "same" };
  }
  return { kind: thirds > 0 ? "brighter" : "darker", thirds: Math.abs(thirds) };
}

/** Thirds of a stop as photographers write them: "⅓", "1", "1⅔". */
export function stopsText(thirds: number): string {
  const whole = Math.floor(thirds / 3);
  const fraction = ["", "⅓", "⅔"][thirds % 3];
  return `${whole > 0 ? whole : ""}${fraction}`;
}

export type WeightDelta ={ kind: "same" | "close" } | { kind: "lighter" | "heavier"; grams: number };

/** Differences within 10% of the current lens's weight read as close; ranges compare by their midpoints. */
export function weightDelta(current: Lens, other: Lens): WeightDelta {
  const base = weightMid(current.weightG);
  const diff = Math.round(weightMid(other.weightG) - base);
  if (diff === 0) {
    return { kind: "same" };
  }
  if (Math.abs(diff) <= base * WEIGHT_CLOSE_SHARE) {
    return { kind: "close" };
  }
  return { kind: diff < 0 ? "lighter" : "heavier", grams: Math.abs(diff) };
}

/** How a zoom's range differs from the current one's at each end, in mm; positive is wider or longer. */
export interface FocalDelta {
  wider: number;
  longer: number;
}

export function focalDelta(current: Lens, other: Lens): FocalDelta {
  return {
    wider: current.focalLengthMin - other.focalLengthMin,
    longer: other.focalLengthMax - current.focalLengthMax,
  };
}

/** The focal lengths the alternatives span, for the section's summary line. */
export function focalSpan(lenses: readonly Lens[]): { min: number; max: number } {
  return {
    min: Math.min(...lenses.map((lens) => lens.focalLengthMin)),
    max: Math.max(...lenses.map((lens) => lens.focalLengthMax)),
  };
}
