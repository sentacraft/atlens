import type { Mount, OpticalTrait } from "@/lib/types";
import {
  manualLensSchema,
  type FOCUS_MOTORS,
  type LENS_USAGES,
  type ManualLens,
} from "@/lib/me/gear-schema";

export const LENS_FEATURES = ["weatherResistant", "apertureRing", "powerZoom", "internalZoom"] as const;
export type LensFeature = (typeof LENS_FEATURES)[number];
const ZOOM_ONLY_FEATURES: readonly LensFeature[] = ["powerZoom", "internalZoom"];

/** The manual-entry form as typed: numbers stay strings until submit. A filled longest focal length makes it a zoom. */
export interface ManualLensDraft {
  brand: string;
  model: string;
  focalMin: string;
  focalMax: string;
  mount: Mount;
  apertureWide: string;
  apertureTele: string;
  autofocus?: boolean;
  ois?: boolean;
  adapted: boolean;
  originalMount: string;
  features: LensFeature[];
  opticalTraits: OpticalTrait[];
  usage?: (typeof LENS_USAGES)[number];
  focusMotor?: (typeof FOCUS_MOTORS)[number];
  weight: string;
  notes: string;
}

export type DraftField = "brand" | "model" | "focalMin" | "focalMax" | "apertureWide" | "apertureTele" | "originalMount" | "weight";
export type DraftError = "errorRequired" | "errorNumber" | "errorFocalOrder" | "errorAperture" | "errorApertureOrder";

export function emptyDraft(mount: Mount): ManualLensDraft {
  return {
    brand: "",
    model: "",
    focalMin: "",
    focalMax: "",
    mount,
    apertureWide: "",
    apertureTele: "",
    adapted: false,
    originalMount: "",
    features: [],
    opticalTraits: [],
    usage: "photo",
    weight: "",
    notes: "",
  };
}

const SCHEMA_FIELD: Record<string, DraftField> = {
  brand: "brand",
  model: "model",
  focalMinMm: "focalMin",
  focalMaxMm: "focalMax",
  maxApertureWide: "apertureWide",
  maxApertureTele: "apertureTele",
  originalMount: "originalMount",
  weightG: "weight",
};

/** Undefined for an empty field, NaN for text that is not a number. */
function parseNumber(text: string): number | undefined {
  const trimmed = text.trim().replace(/^f\/?/i, "");
  return trimmed === "" ? undefined : Number(trimmed);
}

/** True once a longest focal length other than the shortest has been typed. */
export function isZoomDraft(draft: ManualLensDraft): boolean {
  const min = parseNumber(draft.focalMin);
  const max = parseNumber(draft.focalMax);
  return max !== undefined && max !== min;
}

function range(from: number | undefined, to: number | undefined): string | undefined {
  if (from === undefined || Number.isNaN(from)) {
    return undefined;
  }
  return to === undefined || Number.isNaN(to) || to === from ? String(from) : `${from}-${to}`;
}

/** The name a lens saved with a blank name gets, such as "18-50mm F2.8"; undefined until a focal length is typed. */
export function defaultLensName(draft: ManualLensDraft): string | undefined {
  const zoom = isZoomDraft(draft);
  const focal = range(parseNumber(draft.focalMin), zoom ? parseNumber(draft.focalMax) : undefined);
  if (focal === undefined) {
    return undefined;
  }
  const aperture = range(parseNumber(draft.apertureWide), zoom ? parseNumber(draft.apertureTele) : undefined);
  const stop = draft.usage === "cine" ? "T" : "F";
  return aperture === undefined ? `${focal}mm` : `${focal}mm ${stop}${aperture}`;
}

/** Turns the form into a ManualLens, or field errors keyed for the Profile messages. */
export function validateDraft(
  draft: ManualLensDraft,
): { lens: ManualLens; errors?: undefined } | { lens?: undefined; errors: Partial<Record<DraftField, DraftError>> } {
  const errors: Partial<Record<DraftField, DraftError>> = {};
  const numbers: Partial<Record<DraftField, number>> = {};
  const zoom = isZoomDraft(draft);
  const numberFields: DraftField[] = ["focalMin", "focalMax", "apertureWide", "weight"];
  if (zoom) {
    numberFields.push("apertureTele");
  }
  for (const field of numberFields) {
    const value = parseNumber(draft[field as keyof ManualLensDraft] as string);
    if (Number.isNaN(value)) {
      errors[field] = "errorNumber";
    } else if (value !== undefined) {
      numbers[field] = value;
    }
  }
  if (numbers.focalMin === undefined && !errors.focalMin) {
    errors.focalMin = "errorRequired";
  }
  if (!draft.brand.trim()) {
    errors.brand = "errorRequired";
  }
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const candidate = {
    brand: draft.brand,
    model: draft.model.trim() || defaultLensName(draft),
    mount: draft.mount,
    focalMinMm: numbers.focalMin,
    focalMaxMm: zoom ? numbers.focalMax : numbers.focalMin,
    maxApertureWide: numbers.apertureWide,
    maxApertureTele: zoom ? numbers.apertureTele : undefined,
    autofocus: draft.autofocus,
    ois: draft.ois,
    adapted: draft.adapted || undefined,
    originalMount: draft.adapted && draft.originalMount.trim() ? draft.originalMount : undefined,
    ...Object.fromEntries(
      draft.features
        .filter((feature) => zoom || !ZOOM_ONLY_FEATURES.includes(feature))
        .map((feature) => [feature, true]),
    ),
    opticalTraits: draft.opticalTraits.length > 0 ? draft.opticalTraits : undefined,
    usage: draft.usage,
    focusMotor: draft.focusMotor,
    weightG: numbers.weight,
    notes: draft.notes.trim() || undefined,
  };
  const parsed = manualLensSchema.safeParse(
    Object.fromEntries(Object.entries(candidate).filter(([, value]) => value !== undefined)),
  );
  if (parsed.success) {
    return { lens: parsed.data };
  }

  for (const issue of parsed.error.issues) {
    const field = SCHEMA_FIELD[String(issue.path[0])];
    if (!field || errors[field]) {
      continue;
    }
    if (issue.code === "custom" && field === "apertureTele" && numbers.apertureWide === undefined) {
      errors.apertureWide = "errorRequired";
    } else if (issue.code === "custom") {
      errors[field] = field === "focalMin" ? "errorFocalOrder" : "errorApertureOrder";
    } else if (field === "apertureWide" || field === "apertureTele") {
      errors[field] = "errorAperture";
    } else if (field === "brand" || field === "model") {
      errors[field] = "errorRequired";
    } else {
      errors[field] = "errorNumber";
    }
  }
  return { errors };
}

export function isZoomOnlyFeature(feature: LensFeature): boolean {
  return ZOOM_ONLY_FEATURES.includes(feature);
}
