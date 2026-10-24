import type { NamespaceTranslator } from "@/i18n/translator";
import { SPEC_NA, type Lens, type FieldNoteKey } from "@/lib/types";
import type { LensConfigurationLabels } from "@/lib/lens/format";
import { classifyFocusMotor, leadingValue, type FocusMotorClass } from "@/lib/lens/lens";
import * as fmt from "@/lib/lens/format";

export interface StructuredLine {
  value: string;
  label?: string;
}

interface BaseRow {
  label: string;
  labelNote?: string;
  labelNoteVariant?: "info" | "warning";
  fieldNoteKey?: FieldNoteKey;
  // For notes not stored in lens.fieldNotes. fieldNoteKey wins when both are set.
  getNote?: (l: Lens) => string | undefined;
  // A row is hidden when no displayed lens has data for it.
  hasData: (l: Lens) => boolean;
}

export interface TextRow extends BaseRow {
  kind: "text";
  getDisplayValue: (l: Lens) => string | undefined;
  getSubValue?: (l: Lens) => string | undefined;
}

export interface NumericRow extends BaseRow {
  kind: "numeric";
  // Fallback when getStructuredLines returns nothing, and for text-only contexts.
  getDisplayValue: (l: Lens) => string | undefined;
  getSubValue?: (l: Lens) => string | undefined;
  getStructuredLines?: (l: Lens) => StructuredLine[] | undefined;
  toComparable: (l: Lens) => number | undefined;
  bestDir?: "min" | "max";
  // Structured mode matches a line's value exactly; plain mode matches a substring.
  // Omitted: the whole cell is highlighted.
  getHighlightFragment?: (l: Lens) => string | undefined;
  /** The chart that ranks this value; the lens page links to it beside the value. */
  chart?: "weight" | "timeline";
}

export interface BoolRow extends BaseRow {
  kind: "bool";
  getValue: (l: Lens) => boolean | "partial" | undefined;
  getSubValue?: (l: Lens) => string | undefined;
}

export type SpecRow = TextRow | NumericRow | BoolRow;

export interface SpecGroup {
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

export interface ResolvedTextRow {
  kind: "text";
  label: string;
  labelNote?: string;
  labelNoteVariant?: "info" | "warning";
  note?: string;
  displayValue?: string;
  subValue?: string;
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
  chart?: "weight" | "timeline";
}

export interface ResolvedBoolRow {
  kind: "bool";
  label: string;
  labelNote?: string;
  labelNoteVariant?: "info" | "warning";
  note?: string;
  boolValue: boolean | "partial" | undefined;
  subValue?: string;
}

export type ResolvedSpecRow = ResolvedTextRow | ResolvedNumericRow | ResolvedBoolRow;

export interface ResolvedSpecGroup {
  label: string;
  rows: ResolvedSpecRow[];
}

export interface SpecGroupLabels {
  groupOptics: string;
  groupFocus: string;
  groupStabilization: string;
  groupPhysical: string;
  groupFeatures: string;
  groupRelease: string;

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
  internalZoom: string;
  releaseYear: string;
  releaseYearLabelNote: string;
  accessories: string;

  yes: string;
  no: string;
  partial: string;
  retracted: string;
  wide: string;
  tele: string;

  lc: LensConfigurationLabels;

  motorClass: Record<FocusMotorClass, string>;
}

type Translator = NamespaceTranslator<"LensDetail">;

export function buildSpecGroupLabels(t: Translator): SpecGroupLabels {
  return {
    groupOptics: t("groupOptics"),
    groupFocus: t("groupFocus"),
    groupStabilization: t("groupStabilization"),
    groupPhysical: t("groupPhysical"),
    groupFeatures: t("groupFeatures"),
    groupRelease: t("groupRelease"),
    focalLength: t("focalLength"),
    focalLengthEquiv: t("focalLengthEquiv"),
    maxAperture: t("maxAperture"),
    minAperture: t("minAperture"),
    maxTStop: t("maxTStop"),
    minTStop: t("minTStop"),
    angleOfView: t("angleOfView"),
    angleOfViewEstNote: t("angleOfViewEstNote"),
    apertureBladeCount: t("apertureBladeCount"),
    lensConfiguration: t("lensConfiguration"),
    af: t("af"),
    focusMotor: t("focusMotor"),
    internalFocusing: t("internalFocusing"),
    minFocusDist: t("minFocusDist"),
    maxMagnification: t("maxMagnification"),
    ois: t("ois"),
    weight: t("weight"),
    dimensions: t("dimensions"),
    filterSize: t("filterSize"),
    lensMaterial: t("lensMaterial"),
    wr: t("wr"),
    apertureRing: t("apertureRing"),
    powerZoom: t("powerZoom"),
    internalZoom: t("internalZoom"),
    releaseYear: t("releaseYear"),
    releaseYearLabelNote: t("releaseYearLabelNote"),
    accessories: t("accessories"),
    yes: t("yes"),
    no: t("no"),
    partial: t("partial"),
    retracted: t("lengthRetracted"),
    wide: t("lengthWide"),
    tele: t("lengthTele"),
    lc: {
      groups: t("lcGroups"),
      elements: t("lcElements"),
      aspherical: t("lcAspherical"),
      ed: t("lcEd"),
      superEd: t("lcSuperEd"),
      sld: t("lcSld"),
      fld: t("lcFld"),
      highRefractive: t("lcHighRefractive"),
      incl: t("lcIncl"),
    },
    motorClass: {
      linear: t("motorLinear"),
      stepping: t("motorStepping"),
      dc: t("motorDc"),
      other: t("motorOther"),
    },
  };
}

function joinParts(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join("\n");
}

export function resolveSpecRow(row: SpecRow, lens: Lens): ResolvedSpecRow | null {
  if (!row.hasData(lens)) {
    return null;
  }

  const note =
    (row.fieldNoteKey ? lens.fieldNotes?.[row.fieldNoteKey] : undefined) ??
    row.getNote?.(lens);

  const labelNote = row.labelNote;
  const labelNoteVariant = row.labelNoteVariant;

  if (row.kind === "bool") {
    return {
      kind: "bool",
      label: row.label,
      labelNote,
      labelNoteVariant,
      note,
      boolValue: row.getValue(lens),
      subValue: row.getSubValue?.(lens),
    };
  }

  if (row.kind === "numeric") {
    return {
      kind: "numeric",
      label: row.label,
      labelNote,
      labelNoteVariant,
      note,
      displayValue: row.getDisplayValue(lens),
      subValue: row.getSubValue?.(lens),
      structuredLines: row.getStructuredLines?.(lens),
      comparable: row.toComparable(lens),
      bestDir: row.bestDir,
      highlightFragment: row.getHighlightFragment?.(lens),
      chart: row.chart,
    };
  }

  return {
    kind: "text",
    label: row.label,
    labelNote,
    labelNoteVariant,
    note,
    displayValue: row.getDisplayValue(lens),
    subValue: row.getSubValue?.(lens),
  };
}

export function resolveSpecGroups(groups: SpecGroup[], lens: Lens): ResolvedSpecGroup[] {
  return groups
    .map((group) => ({
      label: group.label,
      rows: group.rows
        .map((row) => resolveSpecRow(row, lens))
        .filter((r): r is ResolvedSpecRow => r !== null),
    }))
    .filter((group) => group.rows.length > 0);
}

export function rowPlainText(row: ResolvedSpecRow, labels: SpecValueTextLabels): string {
  if (row.kind === "bool") {
    const primaryText =
      row.boolValue === true
        ? labels.yes
        : row.boolValue === "partial"
          ? labels.partial
          : row.boolValue === false
            ? labels.no
            : labels.unknown;
    return joinParts(primaryText, row.subValue, row.note && `(${row.note})`);
  }

  if (row.kind === "numeric") {
    const primary =
      row.structuredLines && row.structuredLines.length > 0
        ? row.structuredLines
            .map((l) => (l.label ? `${l.value} (${l.label})` : l.value))
            .join("\n")
        : (row.displayValue ?? labels.missing);
    return joinParts(primary, row.subValue, row.note && `(${row.note})`);
  }

  return joinParts(row.displayValue ?? labels.missing, row.subValue, row.note && `(${row.note})`);
}

export function buildSpecGroups(labels: SpecGroupLabels): SpecGroup[] {
  const {
    retracted,
    wide,
    tele,
    angleOfViewEstNote,
    lc,
    motorClass,
  } = labels;

  return [
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
              fmt.focalEquiv(l.focalLengthMin, l.mount),
              fmt.focalEquiv(l.focalLengthMax, l.mount)
            ),
        },
        {
          kind: "numeric",
          label: labels.maxAperture,
          fieldNoteKey: "maxAperture" as FieldNoteKey,
          hasData: (l) => l.maxAperture !== undefined,
          getDisplayValue: (l) =>
            l.maxAperture !== undefined ? fmt.apertureDisplay(l.maxAperture) : "",
          toComparable: (l) => leadingValue(l.maxAperture),
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

    {
      label: labels.groupPhysical,
      rows: [
        {
          kind: "numeric",
          label: labels.weight,
          fieldNoteKey: "weightG" as FieldNoteKey,
          hasData: (l) => l.weightG !== undefined,
          getDisplayValue: (l) => fmt.weightDisplay(l.weightG, "g"),
          toComparable: (l) => leadingValue(l.weightG),
          bestDir: "min",
          chart: "weight",
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
          getSubValue: (l) => (classifyFocusMotor(l) ? l.focusMotor : undefined),
        },
        // internalFocusing is hidden until its data quality is fixed.
        {
          kind: "numeric",
          label: labels.minFocusDist,
          fieldNoteKey: "minFocusDistance" as FieldNoteKey,
          hasData: (l) => l.minFocusDistance !== undefined,
          getDisplayValue: (l) => fmt.mfdHeroValue(l.minFocusDistance),
          getStructuredLines: (l) =>
            fmt.mfdStructuredLines(l.minFocusDistance, { wide, tele }),
          toComparable: (l) => fmt.mfdComparable(l.minFocusDistance),
          bestDir: "min",
          getHighlightFragment: (l) => fmt.mfdHeroValue(l.minFocusDistance),
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
            if (!mag?.variants) {
              return undefined;
            }
            const lines: StructuredLine[] = [];
            if (mag.variants.wide !== undefined)
              {lines.push({ value: `${mag.variants.wide}x`, label: wide });}
            if (mag.variants.tele !== undefined)
              {lines.push({ value: `${mag.variants.tele}x`, label: tele });}
            return lines.length > 0 ? lines : undefined;
          },
          toComparable: (l) => l.maxMagnification?.value,
          bestDir: "max",
          getHighlightFragment: (l) =>
            l.maxMagnification ? `${l.maxMagnification.value}x` : undefined,
        },
      ] satisfies SpecRow[],
    },

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
          hasData: (l) => l.powerZoom !== undefined && l.powerZoom !== SPEC_NA,
          getValue: (l) => (l.powerZoom === SPEC_NA ? undefined : l.powerZoom),
        },
        {
          kind: "bool",
          label: labels.internalZoom,
          fieldNoteKey: "internalZoom" as FieldNoteKey,
          hasData: (l) => l.internalZoom !== undefined && l.internalZoom !== SPEC_NA,
          getValue: (l) => (l.internalZoom === SPEC_NA ? undefined : l.internalZoom),
        },
      ] satisfies SpecRow[],
    },

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
          chart: "timeline",
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
