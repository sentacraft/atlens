import { SPEC_NA, type Lens, type FieldNoteKey, type SpecialtyTag } from "./types";
import type { LensConfigurationLabels } from "./lens.format";
import { classifyFocusMotor, type FocusMotorClass } from "./lens";
import * as fmt from "./lens.format";

// ---------------------------------------------------------------------------
// Structured line type
// ---------------------------------------------------------------------------

/**
 * A single display line with a primary value and an optional context label.
 * Rendered as: `value (label)` where label is smaller and muted.
 * Used when a row contains multiple values (e.g. Wide / Tele variants).
 */
export interface StructuredLine {
  value: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface BaseRow {
  /** Resolved label string (pre-translated by the caller). */
  label: string;
  /** Static note shown in a popover next to the label (not the value). Pre-translated by the caller. */
  labelNote?: string;
  /** Controls the icon and color of the labelNote popover. Defaults to "info". */
  labelNoteVariant?: "info" | "warning";
  /** If set, look up lens.fieldNotes[fieldNoteKey] and show a ⓘ popover. */
  fieldNoteKey?: FieldNoteKey;
  /**
   * Returns a note string to show in a ⓘ popover, computed from the lens.
   * Use when the note is not stored in lens.fieldNotes (e.g. a fixed
   * methodology note that applies whenever a derived value is displayed).
   * Takes precedence after fieldNoteKey when both are defined.
   */
  getNote?: (l: Lens) => string | undefined;
  /**
   * Returns true when this lens has meaningful data for this row.
   * Used for per-view suppression: a row is hidden when no displayed lens has data.
   */
  hasData: (l: Lens) => boolean;
}

export interface TextRow extends BaseRow {
  kind: "text";
  getDisplayValue: (l: Lens) => string | undefined;
  /**
   * Optional secondary value rendered smaller and muted below the primary.
   * Use for supplemental details (e.g. length variants, macro mode).
   */
  getSubValue?: (l: Lens) => string | undefined;
}

export interface NumericRow extends BaseRow {
  kind: "numeric";
  /**
   * Plain-text display value. Used as fallback when getStructuredLines is
   * undefined or returns nothing, and in text-only contexts (e.g. drag ghost).
   */
  getDisplayValue: (l: Lens) => string | undefined;
  /** Optional secondary value rendered smaller and muted below the primary. */
  getSubValue?: (l: Lens) => string | undefined;
  /**
   * Structured lines for rich per-line rendering.
   * When defined and returns data, replaces getDisplayValue in the UI.
   * Each line renders `value` prominently with an optional `label` in lighter
   * color: "13cm (Wide)". getDisplayValue still serves as a plain-text fallback.
   */
  getStructuredLines?: (l: Lens) => StructuredLine[] | undefined;
  /** Returns a number for best-value comparison in the compare table. */
  toComparable: (l: Lens) => number | undefined;
  /** Which direction is "best": min (lower = better) or max (higher = better). */
  bestDir?: "min" | "max";
  /**
   * When this row wins best-value comparison:
   * - Structured mode: matched exactly against StructuredLine.value to find
   *   which line to highlight.
   * - Plain string mode: matched as substring to find which portion to highlight.
   * When omitted the full display value / whole cell is highlighted.
   */
  getHighlightFragment?: (l: Lens) => string | undefined;
}

export interface BoolRow extends BaseRow {
  kind: "bool";
  getValue: (l: Lens) => boolean | "partial" | undefined;
  /** Optional supplemental text rendered below the bool indicator (e.g. "6 stops" for OIS). */
  getSubValue?: (l: Lens) => string | undefined;
}

export type SpecRow = TextRow | NumericRow | BoolRow;

export interface SpecGroup {
  /** Resolved group header label (pre-translated by the caller). */
  label: string;
  rows: SpecRow[];
}

export interface SpecValueTextLabels {
  yes: string;
  no: string;
  partial: string;
  unknown: string;
  missing: string;
}

// ---------------------------------------------------------------------------
// Resolved row types — all formatter functions already called, values are plain data
// ---------------------------------------------------------------------------

export interface ResolvedTextRow {
  kind: "text";
  label: string;
  labelNote?: string;
  labelNoteVariant?: "info" | "warning";
  /** Resolved note for the ⓘ popover, if any. */
  note?: string;
  displayValue?: string;
  subValue?: string;
  /** Plain-text representation of the visible cell — single source of truth for the Report Dialog. */
  plainText: string;
}

export interface ResolvedNumericRow {
  kind: "numeric";
  label: string;
  labelNote?: string;
  labelNoteVariant?: "info" | "warning";
  note?: string;
  displayValue?: string;
  subValue?: string;
  structuredLines?: StructuredLine[];
  comparable?: number;
  bestDir?: "min" | "max";
  highlightFragment?: string;
  plainText: string;
}

export interface ResolvedBoolRow {
  kind: "bool";
  label: string;
  labelNote?: string;
  labelNoteVariant?: "info" | "warning";
  note?: string;
  boolValue: boolean | "partial" | undefined;
  subValue?: string;
  plainText: string;
}

export type ResolvedSpecRow = ResolvedTextRow | ResolvedNumericRow | ResolvedBoolRow;

export interface ResolvedSpecGroup {
  label: string;
  rows: ResolvedSpecRow[];
}

// ---------------------------------------------------------------------------
// Labels interface — caller passes all pre-translated strings
// ---------------------------------------------------------------------------

export interface SpecGroupLabels {
  // Group headers
  groupOptics: string;
  groupFocus: string;
  groupStabilization: string;
  groupPhysical: string;
  groupFeatures: string;
  groupRelease: string;

  // Row labels
  focalLength: string;
  focalLengthEquiv: string;
  maxAperture: string;
  minAperture: string;
  maxTStop: string;
  minTStop: string;
  angleOfView: string;
  angleOfViewEstNote: string;
  apertureBladeCount: string;
  lensConfiguration: string;
  af: string;
  focusMotor: string;
  internalFocusing: string;
  minFocusDist: string;
  maxMagnification: string;
  ois: string;
  weight: string;
  dimensions: string;
  filterSize: string;
  lensMaterial: string;
  wr: string;
  apertureRing: string;
  powerZoom: string;
  specialtyTags: string;
  releaseYear: string;
  releaseYearLabelNote: string;
  accessories: string;

  // Sub-labels used inside formatters
  yes: string;
  no: string;
  partial: string;
  retracted: string;
  wide: string;
  tele: string;
  macro: string;

  // Lens configuration sub-labels
  lc: LensConfigurationLabels;

  // Specialty tag labels
  tags: Record<SpecialtyTag, string>;

  // Focus motor canonical class labels
  motorClass: Record<FocusMotorClass, string>;
}

function joinParts(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join("\n");
}

/**
 * Resolves a single spec row for a specific lens, calling all formatter functions
 * exactly once. Returns null when this lens has no data for the row (caller should
 * omit the row from the visible set for this lens).
 *
 * The returned `plainText` field is the single source of truth for the Report
 * Dialog's "current value" — identical to what is rendered in the spec table.
 */
export function resolveSpecRow(
  row: SpecRow,
  lens: Lens,
  labels: SpecValueTextLabels
): ResolvedSpecRow | null {
  if (!row.hasData(lens)) return null;

  const note =
    (row.fieldNoteKey ? lens.fieldNotes?.[row.fieldNoteKey] : undefined) ??
    row.getNote?.(lens);

  const labelNote = row.labelNote;
  const labelNoteVariant = row.labelNoteVariant;

  if (row.kind === "bool") {
    const boolValue = row.getValue(lens);
    const subValue = row.getSubValue?.(lens);
    const primaryText =
      boolValue === true
        ? labels.yes
        : boolValue === "partial"
          ? labels.partial
          : boolValue === false
            ? labels.no
            : labels.unknown;
    return {
      kind: "bool",
      label: row.label,
      labelNote,
      labelNoteVariant,
      note,
      boolValue,
      subValue,
      plainText: joinParts(primaryText, subValue, note && `(${note})`),
    };
  }

  if (row.kind === "numeric") {
    const structuredLines = row.getStructuredLines?.(lens);
    const displayValue = row.getDisplayValue(lens);
    const subValue = row.getSubValue?.(lens);
    const primary =
      structuredLines && structuredLines.length > 0
        ? structuredLines
            .map((l) => (l.label ? `${l.value} (${l.label})` : l.value))
            .join("\n")
        : (displayValue ?? labels.missing);
    return {
      kind: "numeric",
      label: row.label,
      labelNote,
      labelNoteVariant,
      note,
      displayValue,
      subValue,
      structuredLines,
      comparable: row.toComparable(lens),
      bestDir: row.bestDir,
      highlightFragment: row.getHighlightFragment?.(lens),
      plainText: joinParts(primary, subValue, note && `(${note})`),
    };
  }

  // text
  const displayValue = row.getDisplayValue(lens);
  const subValue = row.getSubValue?.(lens);
  return {
    kind: "text",
    label: row.label,
    labelNote,
    labelNoteVariant,
    note,
    displayValue,
    subValue,
    plainText: joinParts(displayValue ?? labels.missing, subValue, note && `(${note})`),
  };
}

/**
 * Resolves all spec groups for a single lens, filtering out rows and groups
 * where the lens has no data. Use on the detail page or any single-lens view.
 */
export function resolveSpecGroups(
  groups: SpecGroup[],
  lens: Lens,
  labels: SpecValueTextLabels
): ResolvedSpecGroup[] {
  return groups
    .map((group) => ({
      label: group.label,
      rows: group.rows
        .map((row) => resolveSpecRow(row, lens, labels))
        .filter((r): r is ResolvedSpecRow => r !== null),
    }))
    .filter((group) => group.rows.length > 0);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Builds the full list of spec groups with all rows.
 * Call once per render (or memoize) with pre-translated labels.
 *
 * Per-view suppression: filter each group's rows with `row.hasData(lens)`
 * (detail page) or `lenses.some(l => row.hasData(l))` (compare table),
 * then drop groups where no rows remain.
 */
export function buildSpecGroups(labels: SpecGroupLabels): SpecGroup[] {
  const {
    yes,
    no,
    partial,
    retracted,
    wide,
    tele,
    macro,
    angleOfViewEstNote,
    lc,
    tags,
    motorClass,
  } = labels;

  return [
    // -----------------------------------------------------------------------
    // Optics
    // -----------------------------------------------------------------------
    {
      label: labels.groupOptics,
      rows: [
        {
          kind: "text",
          label: labels.focalLength,
          hasData: () => true,
          getDisplayValue: (l) =>
            fmt.focalRangeDisplay(l.focalLengthMin, l.focalLengthMax),
        },
        {
          kind: "text",
          label: labels.focalLengthEquiv,
          hasData: () => true,
          getDisplayValue: (l) =>
            fmt.focalRangeDisplay(
              fmt.focalEquiv(l.focalLengthMin),
              fmt.focalEquiv(l.focalLengthMax)
            ),
        },
        {
          kind: "numeric",
          label: labels.maxAperture,
          fieldNoteKey: "maxAperture" as FieldNoteKey,
          hasData: (l) => l.maxAperture !== undefined,
          getDisplayValue: (l) =>
            l.maxAperture !== undefined ? fmt.apertureDisplay(l.maxAperture) : "",
          toComparable: (l) =>
            l.maxAperture === undefined
              ? undefined
              : Array.isArray(l.maxAperture)
                ? l.maxAperture[0]
                : l.maxAperture,
          bestDir: "min",
        },
        {
          kind: "text",
          label: labels.minAperture,
          hasData: (l) => l.minAperture !== undefined,
          getDisplayValue: (l) =>
            l.minAperture !== undefined ? fmt.apertureDisplay(l.minAperture) : "",
        },
        {
          kind: "text",
          label: labels.maxTStop,
          hasData: (l) => l.maxTStop !== undefined,
          getDisplayValue: (l) => fmt.tStopDisplay(l.maxTStop),
        },
        {
          kind: "text",
          label: labels.minTStop,
          hasData: (l) => l.minTStop !== undefined,
          getDisplayValue: (l) => fmt.tStopDisplay(l.minTStop),
        },
        {
          kind: "text",
          label: labels.angleOfView,
          hasData: (l) =>
            l.angleOfView !== undefined || l.angleOfViewCalc !== undefined,
          getDisplayValue: (l) =>
            fmt.angleOfViewDisplay(l.angleOfView ?? l.angleOfViewCalc),
          getNote: (l) =>
            l.angleOfView === undefined && l.angleOfViewCalc !== undefined
              ? angleOfViewEstNote
              : undefined,
        },
        {
          kind: "numeric",
          label: labels.apertureBladeCount,
          fieldNoteKey: "apertureBladeCount" as FieldNoteKey,
          hasData: (l) => l.apertureBladeCount !== undefined,
          getDisplayValue: (l) =>
            l.apertureBladeCount === SPEC_NA
              ? SPEC_NA
              : fmt.optionalNumber(l.apertureBladeCount, ""),
          toComparable: (l) =>
            typeof l.apertureBladeCount === "number"
              ? l.apertureBladeCount
              : undefined,
          bestDir: "max",
        },
        {
          kind: "text",
          label: labels.lensConfiguration,
          fieldNoteKey: "lensConfiguration" as FieldNoteKey,
          hasData: (l) => l.lensConfiguration !== undefined,
          getDisplayValue: (l) =>
            fmt.lensConfigurationPrimaryDisplay(l.lensConfiguration, lc),
          getSubValue: (l) =>
            fmt.lensConfigurationSecondaryDisplay(l.lensConfiguration, lc),
        },
      ] satisfies SpecRow[],
    },

    // -----------------------------------------------------------------------
    // Physical
    // -----------------------------------------------------------------------
    {
      label: labels.groupPhysical,
      rows: [
        {
          kind: "numeric",
          label: labels.weight,
          fieldNoteKey: "weightG" as FieldNoteKey,
          hasData: (l) => l.weightG !== undefined,
          getDisplayValue: (l) => fmt.weightDisplay(l.weightG, "g"),
          toComparable: (l) =>
            Array.isArray(l.weightG) ? l.weightG[0] : l.weightG,
          bestDir: "min",
        },
        {
          kind: "text",
          label: labels.dimensions,
          hasData: (l) =>
            l.diameterMm !== undefined || l.length !== undefined,
          getDisplayValue: (l) =>
            fmt.dimensionsPrimaryDisplay(l.diameterMm, l.length),
          getSubValue: (l) =>
            fmt.dimensionsVariantsDisplay(l.length, { retracted, wide, tele }),
        },
        {
          kind: "text",
          label: labels.filterSize,
          fieldNoteKey: "filterMm" as FieldNoteKey,
          hasData: (l) => l.filterMm !== undefined,
          getDisplayValue: (l) => fmt.filterSizeDisplay(l.filterMm),
        },
        {
          kind: "text",
          label: labels.lensMaterial,
          hasData: (l) => l.lensMaterial !== undefined,
          getDisplayValue: (l) => l.lensMaterial,
        },
      ] satisfies SpecRow[],
    },

    // -----------------------------------------------------------------------
    // Autofocus
    // -----------------------------------------------------------------------
    {
      label: labels.groupFocus,
      rows: [
        {
          kind: "bool",
          label: labels.af,
          hasData: () => true,
          getValue: (l) => l.af,
        },
        {
          kind: "text",
          label: labels.focusMotor,
          fieldNoteKey: "focusMotor" as FieldNoteKey,
          hasData: (l) => l.focusMotor !== undefined,
          getDisplayValue: (l) => {
            const cls = classifyFocusMotor(l);
            return cls ? motorClass[cls] : l.focusMotor;
          },
          getSubValue: (l) => l.focusMotor,
        },
        // internalFocusing row hidden — data quality issues, to be re-added later
        {
          kind: "numeric",
          label: labels.minFocusDist,
          fieldNoteKey: "minFocusDistance" as FieldNoteKey,
          hasData: (l) => l.minFocusDistance !== undefined,
          getDisplayValue: (l) =>
            fmt.minFocusDistancePrimaryDisplay(l.minFocusDistance, {
              wide,
              tele,
            }),
          getStructuredLines: (l) => {
            const mfd = l.minFocusDistance;
            if (!mfd?.variants) return undefined;
            const lines: StructuredLine[] = [];
            if (mfd.variants.wide !== undefined)
              lines.push({ value: `${mfd.variants.wide}cm`, label: wide });
            if (mfd.variants.tele !== undefined)
              lines.push({ value: `${mfd.variants.tele}cm`, label: tele });
            return lines.length > 0 ? lines : undefined;
          },
          getSubValue: (l) =>
            fmt.minFocusDistanceSecondaryDisplay(l.minFocusDistance, {
              wide,
              tele,
              macro,
            }),
          toComparable: (l) => l.minFocusDistance?.cm,
          bestDir: "min",
          getHighlightFragment: (l) =>
            l.minFocusDistance ? `${l.minFocusDistance.cm}cm` : undefined,
        },
        {
          kind: "numeric",
          label: labels.maxMagnification,
          fieldNoteKey: "maxMagnification" as FieldNoteKey,
          hasData: (l) => l.maxMagnification !== undefined,
          getDisplayValue: (l) =>
            fmt.maxMagnificationPrimaryDisplay(l.maxMagnification, {
              wide,
              tele,
            }),
          getStructuredLines: (l) => {
            const mag = l.maxMagnification;
            if (!mag?.variants) return undefined;
            const lines: StructuredLine[] = [];
            if (mag.variants.wide !== undefined)
              lines.push({ value: `${mag.variants.wide}x`, label: wide });
            if (mag.variants.tele !== undefined)
              lines.push({ value: `${mag.variants.tele}x`, label: tele });
            return lines.length > 0 ? lines : undefined;
          },
          toComparable: (l) => l.maxMagnification?.value,
          bestDir: "max",
          getHighlightFragment: (l) =>
            l.maxMagnification ? `${l.maxMagnification.value}x` : undefined,
        },
      ] satisfies SpecRow[],
    },

    // -----------------------------------------------------------------------
    // Stabilization
    // -----------------------------------------------------------------------
    {
      label: labels.groupStabilization,
      rows: [
        {
          kind: "bool",
          label: labels.ois,
          fieldNoteKey: "ois" as FieldNoteKey,
          hasData: () => true,
          getValue: (l) => l.ois,
          getSubValue: (l) =>
            l.ois && l.oisStops !== undefined
              ? `${l.oisStops} stops`
              : undefined,
        },
      ] satisfies SpecRow[],
    },

    // -----------------------------------------------------------------------
    // Features
    // -----------------------------------------------------------------------
    {
      label: labels.groupFeatures,
      rows: [
        {
          kind: "bool",
          label: labels.wr,
          fieldNoteKey: "wr" as FieldNoteKey,
          hasData: () => true,
          getValue: (l) => (l.wr === "partial" ? "partial" : l.wr),
        },
        {
          kind: "bool",
          label: labels.apertureRing,
          hasData: () => true,
          getValue: (l) => l.apertureRing,
        },
        {
          kind: "bool",
          label: labels.powerZoom,
          hasData: (l) => l.powerZoom !== undefined,
          getValue: (l) => l.powerZoom,
        },
        {
          kind: "text",
          label: labels.specialtyTags,
          hasData: (l) =>
            l.specialtyTags !== undefined && l.specialtyTags.length > 0,
          getDisplayValue: (l) => fmt.specialtyTagsDisplay(l.specialtyTags, tags),
        },
      ] satisfies SpecRow[],
    },

    // -----------------------------------------------------------------------
    // Release
    // -----------------------------------------------------------------------
    {
      label: labels.groupRelease,
      rows: [
        {
          kind: "numeric",
          label: labels.releaseYear,
          labelNote: labels.releaseYearLabelNote,
          hasData: (l) => l.releaseYear !== undefined,
          getDisplayValue: (l) => fmt.optionalNumber(l.releaseYear, ""),
          toComparable: (l) => l.releaseYear,
        },
        {
          kind: "text",
          label: labels.accessories,
          hasData: (l) =>
            l.accessories !== undefined && l.accessories.length > 0,
          getDisplayValue: (l) => l.accessories?.join(", "),
        },
      ] satisfies SpecRow[],
    },
  ];
}
