import type {
  Lens,
  LensConfiguration,
  LensLength,
  MaxMagnification,
  MinFocusDistance,
  Mount,
} from "./types";
import { SPEC_NA } from "./types";
import { CROP_FACTOR } from "./lens";

export function oisDisplay(
  ois: boolean,
  oisStops: number | undefined,
  labels: { yes: string; no: string }
): string {
  if (!ois) {
    return labels.no;
  }
  return oisStops !== undefined ? `${labels.yes} (${oisStops}-stop)` : labels.yes;
}

export function focalEquiv(n: number, mount: Mount = "X"): number {
  return Math.round(n * CROP_FACTOR[mount]);
}

export function focalRangeDisplay(min: number, max: number): string {
  return min === max ? `${min}mm` : `${min}–${max}mm`;
}

export function apertureDisplay(aperture: NonNullable<Lens["maxAperture"]>): string {
  return Array.isArray(aperture)
    ? `f/${aperture[0]}–${aperture[1]}`
    : `f/${aperture}`;
}

export function tStopDisplay(
  tStop: Lens["maxTStop"] | undefined
): string | undefined {
  if (tStop === undefined) {
    return undefined;
  }
  return Array.isArray(tStop) ? `T${tStop[0]}–${tStop[1]}` : `T${tStop}`;
}

/**
 * Primary aperture string for prominent UI slots (card titles, posters).
 * Cine lenses without a published f-stop show T-stop in the primary slot.
 * Returns undefined when neither value is available.
 */
export function primaryApertureDisplay(lens: Lens): string | undefined {
  if (lens.maxAperture !== undefined) {
    return apertureDisplay(lens.maxAperture);
  }
  return tStopDisplay(lens.maxTStop);
}

/**
 * Secondary aperture string shown beneath the primary slot when both an
 * f-stop and a T-stop are published. Returns undefined when only one (or
 * neither) is available, so callers can suppress the secondary line.
 */
export function secondaryApertureDisplay(lens: Lens): string | undefined {
  if (lens.maxAperture === undefined) {
    return undefined;
  }
  return tStopDisplay(lens.maxTStop);
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
  if (weightG === undefined) {
    return undefined;
  }
  if (Array.isArray(weightG)) {
    return `${weightG[0]}–${weightG[1]}${unit}`;
  }
  return `${weightG}${unit}`;
}

export function wrDisplay(
  wr: boolean | "partial",
  labels: { yes: string; no: string; partial: string }
): string {
  if (wr === true) {
    return labels.yes;
  }
  if (wr === "partial") {
    return labels.partial;
  }
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
  if (angleOfView === undefined) {
    return undefined;
  }
  if (Array.isArray(angleOfView)) {
    return `${angleOfView[0]}°–${angleOfView[1]}°`;
  }
  return `${angleOfView}°`;
}

export function magnificationDisplay(
  maxMagnification: MaxMagnification | undefined,
): string | undefined {
  if (maxMagnification === undefined) {
    return undefined;
  }
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
  if (!hasDiameter && !hasLength) {
    return undefined;
  }

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
 * Combined max magnification display. Shows wide/tele variants for zoom lenses,
 * otherwise the single value.
 */
export function maxMagnificationRichDisplay(
  maxMag: MaxMagnification | undefined,
  labels: { wide: string; tele: string }
): string | undefined {
  if (!maxMag) {
    return undefined;
  }

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

// --- Lens name formatters ---

/**
 * Single-line full display name: "Brand [Series] Model".
 * Use in chips, aria-labels, captions, and any single-line context.
 * For Fujifilm the series (XF/XC/MKX) is already embedded in the model
 * name, so it is omitted to avoid duplication.
 */
export function lensDisplayName(
  brandName: string,
  series: string | undefined,
  model: string,
  brandKey?: string
): string {
  if (!series || brandKey === "fujifilm") {
    return `${brandName} ${model}`;
  }
  return `${brandName} ${series} ${model}`;
}

/**
 * First line of the two-line name layout: "Brand [· Series]".
 * Use as the subtitle/eyebrow above the model name.
 */
export function lensSubtitleLine(
  brandName: string,
  series: string | undefined
): string {
  return series ? `${brandName} · ${series}` : brandName;
}

// --- Split primary / secondary formatters ---

/** Primary dimensions line: ⌀D × Lmm */
export function dimensionsPrimaryDisplay(
  diameterMm: number | undefined,
  length: LensLength | undefined
): string | undefined {
  const hasDiameter = diameterMm !== undefined;
  const hasLength = length?.mm !== undefined;
  if (!hasDiameter && !hasLength) {
    return undefined;
  }
  if (hasDiameter && hasLength) {
    return `⌀${diameterMm} × ${length!.mm}mm`;
  }
  if (hasDiameter) {
    return `⌀${diameterMm}mm`;
  }
  return `${length!.mm}mm`;
}

/** Secondary dimensions: one line per state (Retracted / Wide / Tele). */
export function dimensionsVariantsDisplay(
  length: LensLength | undefined,
  labels: { retracted: string; wide: string; tele: string }
): string | undefined {
  const variants = length?.variants;
  if (!variants) {
    return undefined;
  }
  const parts = [
    variants.retracted !== undefined
      ? `${labels.retracted} ${variants.retracted}mm`
      : null,
    variants.wide !== undefined ? `${labels.wide} ${variants.wide}mm` : null,
    variants.tele !== undefined ? `${labels.tele} ${variants.tele}mm` : null,
  ].filter((v): v is string => v !== null);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

function effectiveMfdMode(mfd: MinFocusDistance): MinFocusDistance["normal"] {
  return mfd.macro ?? mfd.normal;
}

export function mfdHeroValue(mfd: MinFocusDistance | undefined): string | undefined {
  if (!mfd) {
    return undefined;
  }
  const mode = effectiveMfdMode(mfd);
  if (mode.teleCm !== undefined) {
    return `${Math.min(mode.cm, mode.teleCm)}cm`;
  }
  return `${mode.cm}cm`;
}

export function mfdHeroQualifier(
  mfd: MinFocusDistance | undefined,
  labels: { wide: string; tele: string }
): string | undefined {
  if (!mfd) {
    return undefined;
  }
  const mode = effectiveMfdMode(mfd);
  if (mode.teleCm === undefined || mode.cm === mode.teleCm) {
    return undefined;
  }
  return mode.cm <= mode.teleCm ? labels.wide : labels.tele;
}

export function mfdStructuredLines(
  mfd: MinFocusDistance | undefined,
  labels: { wide: string; tele: string }
): Array<{ value: string; label: string }> | undefined {
  if (!mfd) {
    return undefined;
  }
  const mode = effectiveMfdMode(mfd);
  if (mode.teleCm === undefined) {
    return undefined;
  }
  return [
    { value: `${mode.cm}cm`, label: labels.wide },
    { value: `${mode.teleCm}cm`, label: labels.tele },
  ];
}

export function mfdComparable(mfd: MinFocusDistance | undefined): number | undefined {
  if (!mfd) {
    return undefined;
  }
  const mode = effectiveMfdMode(mfd);
  return mode.teleCm !== undefined ? Math.min(mode.cm, mode.teleCm) : mode.cm;
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
  if (!maxMag) {
    return undefined;
  }
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
  if (!maxMag?.variants) {
    return undefined;
  }
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
  if (base === undefined && vendor === undefined) {
    return null;
  }
  const baseCount = base ?? 0;
  const vendorCount = vendor ?? 0;
  const total = baseCount + vendorCount;
  if (total === 0) {
    return null;
  }
  if (vendorCount === 0) {
    return `${total} ${baseLabel}`;
  }
  if (baseCount === 0) {
    return `${total} ${baseLabel} (${vendorCount} ${vendorLabel})`;
  }
  return `${total} ${baseLabel} (${inclLabel} ${vendorCount} ${vendorLabel})`;
}

/** Primary lens configuration line: "9 groups / 11 elements" */
export function lensConfigurationPrimaryDisplay(
  configuration: LensConfiguration | undefined,
  labels: LensConfigurationLabels
): string | undefined {
  if (!configuration) {
    return undefined;
  }
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
  if (!configuration) {
    return undefined;
  }
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
  if (!configuration) {
    return undefined;
  }
  const primary = lensConfigurationPrimaryDisplay(configuration, labels);
  const secondary = lensConfigurationSecondaryDisplay(configuration, labels);
  return [primary, secondary].filter(Boolean).join("\n");
}

