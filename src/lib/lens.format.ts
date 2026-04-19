import type {
  Lens,
  LensConfiguration,
  LensLength,
  MaxMagnification,
  MinFocusDistance,
  SpecialtyTag,
} from "./types";
import { SPEC_NA } from "./types";

const CROP_FACTOR = 1.5;

export function oisDisplay(
  ois: boolean,
  oisStops: number | undefined,
  labels: { yes: string; no: string }
): string {
  if (!ois) return labels.no;
  return oisStops !== undefined ? `${labels.yes} (${oisStops}-stop)` : labels.yes;
}

export function focalEquiv(n: number): number {
  return Math.round(n * CROP_FACTOR);
}

export function focalRangeDisplay(min: number, max: number): string {
  return min === max ? `${min}mm` : `${min}–${max}mm`;
}

export function apertureDisplay(aperture: Lens["maxAperture"]): string {
  return Array.isArray(aperture)
    ? `f/${aperture[0]}–${aperture[1]}`
    : `f/${aperture}`;
}

export function tStopDisplay(
  tStop: Lens["maxTStop"] | undefined
): string | undefined {
  if (tStop === undefined) return undefined;
  return Array.isArray(tStop) ? `T${tStop[0]}–${tStop[1]}` : `T${tStop}`;
}

export function optionalNumber(
  value: number | undefined,
  unit: string
): string | undefined {
  return value === undefined ? undefined : `${value}${unit}`;
}

export function weightDisplay(
  weightG: number | [number, number] | undefined,
  unit: string
): string | undefined {
  if (weightG === undefined) return undefined;
  if (Array.isArray(weightG)) return `${weightG[0]}–${weightG[1]}${unit}`;
  return `${weightG}${unit}`;
}

export function wrDisplay(
  wr: boolean | "partial",
  labels: { yes: string; no: string; partial: string }
): string {
  if (wr === true) return labels.yes;
  if (wr === "partial") return labels.partial;
  return labels.no;
}

export function filterSizeDisplay(
  filterMm: Lens["filterMm"]
): string | undefined {
  if (filterMm === undefined) {
    return undefined;
  }
  if (filterMm === SPEC_NA) {
    return SPEC_NA;
  }
  return `${filterMm}mm`;
}

export function angleOfViewDisplay(
  angleOfView: number | [number, number] | undefined,
): string | undefined {
  if (angleOfView === undefined) return undefined;
  if (Array.isArray(angleOfView)) return `${angleOfView[0]}°–${angleOfView[1]}°`;
  return `${angleOfView}°`;
}

export function magnificationDisplay(
  maxMagnification: MaxMagnification | undefined,
): string | undefined {
  if (maxMagnification === undefined) return undefined;
  return `${maxMagnification.value}x`;
}

// --- Rich combined formatters ---

/**
 * Combined dimensions display: ⌀diameter × length, with optional length variants
 * on a second line (retracted / wide / tele).
 */
export function dimensionsRichDisplay(
  diameterMm: number | undefined,
  length: LensLength | undefined,
  labels: { retracted: string; wide: string; tele: string }
): string | undefined {
  const hasDiameter = diameterMm !== undefined;
  const hasLength = length?.mm !== undefined;
  if (!hasDiameter && !hasLength) return undefined;

  const parts: string[] = [];

  if (hasDiameter && hasLength) {
    parts.push(`⌀${diameterMm} × ${length!.mm}mm`);
  } else if (hasDiameter) {
    parts.push(`⌀${diameterMm}mm`);
  } else {
    parts.push(`${length!.mm}mm`);
  }

  if (length?.variants) {
    const variantParts = [
      length.variants.retracted !== undefined
        ? `${labels.retracted} ${length.variants.retracted}mm`
        : null,
      length.variants.wide !== undefined
        ? `${labels.wide} ${length.variants.wide}mm`
        : null,
      length.variants.tele !== undefined
        ? `${labels.tele} ${length.variants.tele}mm`
        : null,
    ].filter((v): v is string => v !== null);
    if (variantParts.length > 0) {
      parts.push(variantParts.join(" · "));
    }
  }

  return parts.join("\n");
}

/**
 * Combined min focus distance display. Shows wide/tele variants for zoom lenses,
 * and appends macro mode distance(s) when present.
 */
export function minFocusDistanceRichDisplay(
  mfd: MinFocusDistance | undefined,
  labels: { wide: string; tele: string; macro: string }
): string | undefined {
  if (!mfd) return undefined;

  const lines: string[] = [];

  // Primary / normal mode
  if (mfd.variants?.wide !== undefined || mfd.variants?.tele !== undefined) {
    const parts = [
      mfd.variants.wide !== undefined
        ? `${labels.wide} ${mfd.variants.wide}cm`
        : null,
      mfd.variants.tele !== undefined
        ? `${labels.tele} ${mfd.variants.tele}cm`
        : null,
    ].filter((v): v is string => v !== null);
    lines.push(parts.join(" · "));
  } else {
    lines.push(`${mfd.cm}cm`);
  }

  // Macro mode
  if (
    mfd.macroVariants?.wide !== undefined ||
    mfd.macroVariants?.tele !== undefined
  ) {
    const parts = [
      mfd.macroVariants.wide !== undefined
        ? `${labels.wide} ${mfd.macroVariants.wide}cm`
        : null,
      mfd.macroVariants.tele !== undefined
        ? `${labels.tele} ${mfd.macroVariants.tele}cm`
        : null,
    ].filter((v): v is string => v !== null);
    lines.push(`${labels.macro}: ${parts.join(" · ")}`);
  } else if (mfd.macroCm !== undefined) {
    lines.push(`${labels.macro}: ${mfd.macroCm}cm`);
  }

  return lines.join("\n");
}

/**
 * Combined max magnification display. Shows wide/tele variants for zoom lenses,
 * otherwise the single value.
 */
export function maxMagnificationRichDisplay(
  maxMag: MaxMagnification | undefined,
  labels: { wide: string; tele: string }
): string | undefined {
  if (!maxMag) return undefined;

  if (maxMag.variants?.wide !== undefined || maxMag.variants?.tele !== undefined) {
    const parts = [
      maxMag.variants.wide !== undefined
        ? `${labels.wide} ${maxMag.variants.wide}x`
        : null,
      maxMag.variants.tele !== undefined
        ? `${labels.tele} ${maxMag.variants.tele}x`
        : null,
    ].filter((v): v is string => v !== null);
    return parts.join(" · ");
  }

  return `${maxMag.value}x`;
}

/**
 * Formats specialty tags as a comma-separated readable string.
 */
export function specialtyTagsDisplay(
  tags: SpecialtyTag[] | undefined,
  labels: Record<SpecialtyTag, string>
): string | undefined {
  if (!tags || tags.length === 0) return undefined;
  return tags.map((tag) => labels[tag]).join(", ");
}

// --- Split primary / secondary formatters ---

/** Primary dimensions line: ⌀D × Lmm */
export function dimensionsPrimaryDisplay(
  diameterMm: number | undefined,
  length: LensLength | undefined
): string | undefined {
  const hasDiameter = diameterMm !== undefined;
  const hasLength = length?.mm !== undefined;
  if (!hasDiameter && !hasLength) return undefined;
  if (hasDiameter && hasLength) return `⌀${diameterMm} × ${length!.mm}mm`;
  if (hasDiameter) return `⌀${diameterMm}mm`;
  return `${length!.mm}mm`;
}

/** Secondary dimensions: one line per state (Retracted / Wide / Tele). */
export function dimensionsVariantsDisplay(
  length: LensLength | undefined,
  labels: { retracted: string; wide: string; tele: string }
): string | undefined {
  const variants = length?.variants;
  if (!variants) return undefined;
  const parts = [
    variants.retracted !== undefined
      ? `${labels.retracted} ${variants.retracted}mm`
      : null,
    variants.wide !== undefined ? `${labels.wide} ${variants.wide}mm` : null,
    variants.tele !== undefined ? `${labels.tele} ${variants.tele}mm` : null,
  ].filter((v): v is string => v !== null);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

/**
 * Primary MFD display.
 * - Zoom with wide/tele variants: shows "Wide Xcm · Tele Ycm" (avoids redundant cm line).
 * - Everything else: shows the primary cm value.
 * toComparable always uses mfd.cm regardless of display format.
 */
export function minFocusDistancePrimaryDisplay(
  mfd: MinFocusDistance | undefined,
  labels: { wide: string; tele: string }
): string | undefined {
  if (!mfd) return undefined;
  if (mfd.variants?.wide !== undefined || mfd.variants?.tele !== undefined) {
    const parts = [
      mfd.variants.wide !== undefined
        ? `${labels.wide} ${mfd.variants.wide}cm`
        : null,
      mfd.variants.tele !== undefined
        ? `${labels.tele} ${mfd.variants.tele}cm`
        : null,
    ].filter((v): v is string => v !== null);
    return parts.join(" · ");
  }
  return `${mfd.cm}cm`;
}

/**
 * Secondary MFD display: macro mode info only.
 * Variants are already shown in the primary line, so this avoids duplication.
 */
export function minFocusDistanceSecondaryDisplay(
  mfd: MinFocusDistance | undefined,
  labels: { wide: string; tele: string; macro: string }
): string | undefined {
  if (!mfd) return undefined;

  if (
    mfd.macroVariants?.wide !== undefined ||
    mfd.macroVariants?.tele !== undefined
  ) {
    const parts = [
      mfd.macroVariants.wide !== undefined
        ? `${labels.wide} ${mfd.macroVariants.wide}cm`
        : null,
      mfd.macroVariants.tele !== undefined
        ? `${labels.tele} ${mfd.macroVariants.tele}cm`
        : null,
    ].filter((v): v is string => v !== null);
    return `${labels.macro}: ${parts.join(" · ")}`;
  }
  if (mfd.macroCm !== undefined) {
    return `${labels.macro}: ${mfd.macroCm}cm`;
  }
  return undefined;
}

/**
 * Primary magnification display.
 * - Zoom with wide/tele variants: shows "Wide Xx · Tele Yx" (avoids redundant value line).
 * - Everything else: shows the primary value.
 * toComparable always uses maxMag.value regardless of display format.
 */
export function maxMagnificationPrimaryDisplay(
  maxMag: MaxMagnification | undefined,
  labels: { wide: string; tele: string }
): string | undefined {
  if (!maxMag) return undefined;
  if (maxMag.variants?.wide !== undefined || maxMag.variants?.tele !== undefined) {
    const parts = [
      maxMag.variants.wide !== undefined
        ? `${labels.wide} ${maxMag.variants.wide}x`
        : null,
      maxMag.variants.tele !== undefined
        ? `${labels.tele} ${maxMag.variants.tele}x`
        : null,
    ].filter((v): v is string => v !== null);
    return parts.join(" · ");
  }
  return `${maxMag.value}x`;
}

/** Secondary magnification: wide/tele breakdown, if any. */
export function maxMagnificationSecondaryDisplay(
  maxMag: MaxMagnification | undefined,
  labels: { wide: string; tele: string }
): string | undefined {
  if (!maxMag?.variants) return undefined;
  const parts = [
    maxMag.variants.wide !== undefined
      ? `${labels.wide} ${maxMag.variants.wide}x`
      : null,
    maxMag.variants.tele !== undefined
      ? `${labels.tele} ${maxMag.variants.tele}x`
      : null,
  ].filter((v): v is string => v !== null);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

// --- Lens configuration ---

export interface LensConfigurationLabels {
  groups: string;
  elements: string;
  aspherical: string;
  ed: string;
  superEd: string;
  sld: string;
  fld: string;
  highRefractive: string;
  incl: string;
}

/**
 * Merge manufacturer-specific low-dispersion counts into a unified display line.
 * e.g. ed=3 + sld=2 → "5 ED (incl. 2 SLD)"
 */
function mergedElementLine(
  base: number | undefined,
  baseLabel: string,
  vendor: number | undefined,
  vendorLabel: string,
  inclLabel: string
): string | null {
  if (base === undefined && vendor === undefined) return null;
  const baseCount = base ?? 0;
  const vendorCount = vendor ?? 0;
  const total = baseCount + vendorCount;
  if (total === 0) return null;
  if (vendorCount === 0) return `${total} ${baseLabel}`;
  if (baseCount === 0) return `${total} ${baseLabel} (${vendorCount} ${vendorLabel})`;
  return `${total} ${baseLabel} (${inclLabel} ${vendorCount} ${vendorLabel})`;
}

/** Primary lens configuration line: "9 groups / 11 elements" */
export function lensConfigurationPrimaryDisplay(
  configuration: LensConfiguration | undefined,
  labels: LensConfigurationLabels
): string | undefined {
  if (!configuration) return undefined;
  return `${configuration.groups} ${labels.groups} / ${configuration.elements} ${labels.elements}`;
}

/**
 * Secondary lens configuration line: element types joined with " · ".
 * e.g. "3 Asph. · 3 ED · 1 Super ED"
 */
export function lensConfigurationSecondaryDisplay(
  configuration: LensConfiguration | undefined,
  labels: LensConfigurationLabels
): string | undefined {
  if (!configuration) return undefined;
  const parts = [
    configuration.aspherical !== undefined
      ? `${configuration.aspherical} ${labels.aspherical}`
      : null,
    mergedElementLine(
      configuration.ed,
      labels.ed,
      configuration.sld,
      labels.sld,
      labels.incl
    ),
    mergedElementLine(
      configuration.superEd,
      labels.superEd,
      configuration.fld,
      labels.fld,
      labels.incl
    ),
    configuration.highRefractive !== undefined
      ? `${configuration.highRefractive} ${labels.highRefractive}`
      : null,
  ].filter((v): v is string => v !== null);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function lensConfigurationDisplay(
  configuration: LensConfiguration | undefined,
  labels: LensConfigurationLabels
): string | undefined {
  if (!configuration) return undefined;
  const primary = lensConfigurationPrimaryDisplay(configuration, labels);
  const secondary = lensConfigurationSecondaryDisplay(configuration, labels);
  return [primary, secondary].filter(Boolean).join("\n");
}

