import { z } from "zod";

import { SPEC_NA, SPECIALTY_TAGS } from "./types.ts";
import type { ApertureValue, Lens } from "./types.ts";

const positiveNumberSchema = z.number().positive();
const nonEmptyStringSchema = z.string().trim().min(1);
const optionalNonEmptyStringSchema = nonEmptyStringSchema.optional();
function createApertureSchema(fieldName: "maxAperture" | "minAperture" | "maxTStop" | "minTStop") {
  return z.union([
    positiveNumberSchema,
    z.tuple([positiveNumberSchema, positiveNumberSchema]).refine(
      (arr) => arr[0] < arr[1],
      {
        message: `When ${fieldName} is an array, the first value (wide) must be less than the second (tele)`,
      }
    ),
  ]);
}

const maxApertureSchema = createApertureSchema("maxAperture");
const minApertureSchema = createApertureSchema("minAperture");
const maxTStopSchema = createApertureSchema("maxTStop");
const minTStopSchema = createApertureSchema("minTStop");
const specialtyTagSchema = z.enum(SPECIALTY_TAGS);
export const specNaSchema = z.literal(SPEC_NA);

export const focusDistanceVariantsSchema = z.strictObject({
  wide: positiveNumberSchema.optional(),
  tele: positiveNumberSchema.optional(),
});

export const magnificationVariantsSchema = z.strictObject({
  wide: positiveNumberSchema.optional(),
  tele: positiveNumberSchema.optional(),
});

const lensBaseShape = {
  id: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brand: nonEmptyStringSchema,
  series: optionalNonEmptyStringSchema,
  model: nonEmptyStringSchema,
  generation: z.number().int().positive().optional(),
  focalLengthMin: positiveNumberSchema,
  focalLengthMax: positiveNumberSchema,
  maxAperture: maxApertureSchema.optional(),
  minAperture: minApertureSchema.optional(),
  maxTStop: maxTStopSchema.optional(),
  minTStop: minTStopSchema.optional(),
  specialtyTags: z.array(specialtyTagSchema).min(1).optional(),
  af: z.boolean(),
  ois: z.boolean(),
  oisStops: positiveNumberSchema.optional(),
  wr: z.union([z.boolean(), z.literal("partial")]),
  apertureRing: z.boolean(),
  powerZoom: z.boolean().optional(),
  focusMotor: optionalNonEmptyStringSchema,
  internalFocusing: z.boolean().optional(),
  weightG: z.union([
    positiveNumberSchema,
    z.tuple([positiveNumberSchema, positiveNumberSchema]).refine(
      (arr) => arr[0] < arr[1],
      { message: "weightG range: first value (min) must be less than second (max)" }
    ),
  ]).optional(),
  diameterMm: positiveNumberSchema.optional(),
  length: z.strictObject({
    mm: positiveNumberSchema,
    variants: z.strictObject({
      retracted: positiveNumberSchema.optional(),
      wide: positiveNumberSchema.optional(),
      tele: positiveNumberSchema.optional(),
    }).optional(),
  }).optional(),
  minFocusDistance: z.strictObject({
    cm: positiveNumberSchema,
    macroCm: positiveNumberSchema.optional(),
    variants: focusDistanceVariantsSchema.optional(),
    macroVariants: focusDistanceVariantsSchema.optional(),
  }).optional(),
  maxMagnification: z.strictObject({
    value: positiveNumberSchema,
    variants: magnificationVariantsSchema.optional(),
  }).optional(),
  angleOfView: z.union([
    positiveNumberSchema,
    z.tuple([positiveNumberSchema, positiveNumberSchema]).refine(
      (arr) => arr[0] > arr[1],
      { message: "angleOfView tuple must be [wideEnd, teleEnd] with wide > tele" }
    ),
  ]).optional(),
  angleOfViewCalc: z.union([
    positiveNumberSchema,
    z.tuple([positiveNumberSchema, positiveNumberSchema]).refine(
      (arr) => arr[0] > arr[1],
      { message: "angleOfViewCalc tuple must be [wideEnd, teleEnd] with wide > tele" }
    ),
  ]).optional(),
  apertureBladeCount: z.union([z.number().int().positive(), specNaSchema]).optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  compatibleMounts: z.array(nonEmptyStringSchema).min(1).optional(),
  accessories: z.array(nonEmptyStringSchema).min(1).optional(),
  lensMaterial: optionalNonEmptyStringSchema,
} as const;

export const officialLinksSchema = z
  .strictObject({
    cn: z.url().optional(),
    global: z.url().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.cn && !value.global) {
      ctx.addIssue({
        code: "custom",
        message: "officialLinks must include at least one of cn or global",
        path: [],
      });
    }
  });

export const lensConfigurationSchema = z
  .strictObject({
    groups: z.number().int().positive(),
    elements: z.number().int().positive(),
    aspherical: z.number().int().nonnegative().optional(),
    ed: z.number().int().nonnegative().optional(),
    superEd: z.number().int().nonnegative().optional(),
    sld: z.number().int().nonnegative().optional(),
    fld: z.number().int().nonnegative().optional(),
    highRefractive: z.number().int().nonnegative().optional(),
    sourceText: optionalNonEmptyStringSchema,
  })
  .superRefine((value, ctx) => {
    if (value.groups > value.elements) {
      ctx.addIssue({
        code: "custom",
        message: "lensConfiguration.groups cannot exceed lensConfiguration.elements",
        path: ["groups"],
      });
    }
  });

// z.record(enum, string) infers Record<K, string> (all keys required), but the
// intended semantics are Partial<Record<K, string>> (keys are individually optional).
// Using strictObject + optional per-field produces the correct inferred type.
const fieldNotesSchema = z.strictObject({
  wr: nonEmptyStringSchema.optional(),
  weightG: nonEmptyStringSchema.optional(),
  filterMm: nonEmptyStringSchema.optional(),
  minFocusDistance: nonEmptyStringSchema.optional(),
  maxMagnification: nonEmptyStringSchema.optional(),
  lensConfiguration: nonEmptyStringSchema.optional(),
  ois: nonEmptyStringSchema.optional(),
  focusMotor: nonEmptyStringSchema.optional(),
  maxAperture: nonEmptyStringSchema.optional(),
  minAperture: nonEmptyStringSchema.optional(),
  apertureBladeCount: nonEmptyStringSchema.optional(),
});

const lensObjectSchema = z.strictObject({
  ...lensBaseShape,
  filterMm: z.union([positiveNumberSchema, specNaSchema]).optional(),
  lensConfiguration: lensConfigurationSchema.optional(),
  fieldNotes: fieldNotesSchema.optional(),
  officialLinks: officialLinksSchema,
});

function getApertureEndpoints(aperture: ApertureValue): {
  wide: number;
  tele: number | undefined;
} {
  return Array.isArray(aperture)
    ? { wide: aperture[0], tele: aperture[1] }
    : { wide: aperture, tele: undefined };
}

function validateAperturePair(
  maxValue: ApertureValue | undefined,
  minValue: ApertureValue | undefined,
  ctx: z.RefinementCtx,
  labels: {
    maxField: "maxAperture" | "maxTStop";
    minField: "minAperture" | "minTStop";
  },
): void {
  if (maxValue === undefined || minValue === undefined) {
    return;
  }

  const maxEndpoints = getApertureEndpoints(maxValue);
  const minEndpoints = getApertureEndpoints(minValue);
  const maxWidePath = Array.isArray(maxValue) ? [labels.maxField, 0] : [labels.maxField];
  const maxTelePath = Array.isArray(maxValue) ? [labels.maxField, 1] : [labels.maxField];

  if (maxEndpoints.wide > minEndpoints.wide) {
    ctx.addIssue({
      code: "custom",
      message: `${labels.maxField} wide-end cannot be greater than ${labels.minField} wide-end`,
      path: maxWidePath,
    });
  }

  if (
    minEndpoints.tele !== undefined &&
    maxEndpoints.wide > minEndpoints.tele
  ) {
    ctx.addIssue({
      code: "custom",
      message: `${labels.maxField} cannot be greater than ${labels.minField} tele-end`,
      path: maxWidePath,
    });
  }

  if (
    maxEndpoints.tele !== undefined &&
    maxEndpoints.tele > (minEndpoints.tele ?? minEndpoints.wide)
  ) {
    ctx.addIssue({
      code: "custom",
      message: minEndpoints.tele !== undefined
        ? `${labels.maxField} tele-end cannot be greater than ${labels.minField} tele-end`
        : `${labels.maxField} tele-end cannot be greater than ${labels.minField}`,
      path: maxTelePath,
    });
  }
}

function applyLensBusinessRules(
  value: {
    focalLengthMin?: number;
    focalLengthMax?: number;
    maxAperture?: ApertureValue;
    minAperture?: ApertureValue;
    maxTStop?: ApertureValue;
    minTStop?: ApertureValue;
  },
  ctx: z.RefinementCtx
): void {
  if (
    value.focalLengthMin !== undefined &&
    value.focalLengthMax !== undefined &&
    value.focalLengthMin > value.focalLengthMax
  ) {
    ctx.addIssue({
      code: "custom",
      message: "focalLengthMin cannot be greater than focalLengthMax",
      path: ["focalLengthMin"],
    });
  }

  // At least one fully-populated aperture pair must be present. f-stop is the
  // primary path for stills lenses; T-stop is allowed as the sole path for
  // cine lenses whose source publishes only T-stop. Schema is intentionally
  // tag-independent — the cine vs non-cine distinction is enforced by the
  // pipeline's readiness gate, not here.
  const hasFStopPair =
    value.maxAperture !== undefined && value.minAperture !== undefined;
  const hasTStopPair =
    value.maxTStop !== undefined && value.minTStop !== undefined;
  if (!hasFStopPair && !hasTStopPair) {
    ctx.addIssue({
      code: "custom",
      message:
        "At least one of (maxAperture+minAperture) or (maxTStop+minTStop) must be fully populated",
      path: ["maxAperture"],
    });
  }

  validateAperturePair(value.maxAperture, value.minAperture, ctx, {
    maxField: "maxAperture",
    minField: "minAperture",
  });

  validateAperturePair(value.maxTStop, value.minTStop, ctx, {
    maxField: "maxTStop",
    minField: "minTStop",
  });
}

export const lensSchema = lensObjectSchema.superRefine((value, ctx) => {
  applyLensBusinessRules(value, ctx);
});

export const lensPatchSchema = lensObjectSchema.partial().superRefine((value, ctx) => {
  applyLensBusinessRules(value, ctx);
});

// Pairs of lens IDs confirmed to be distinct despite scoring above the spec
// similarity threshold. Also used by the pipeline image dedupe gate.
// Format: "idA|idB" with IDs sorted alphabetically. Add a comment explaining
// what actually distinguishes the pair — the gate error output shows you the
// equalFields / diffFields diff to inform that decision.
export function makeAllowlistKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
export const KNOWN_DISTINCT_PAIRS = new Set([
  // Tilt-shift mechanism adds tilt/shift axes; lensConfiguration and
  // specialtyTags differ even though optical formula is the same.
  makeAllowlistKey(
    "ttartisan-100mm-f28-2x-macro-xf",
    "ttartisan-tilt-shift-100mm-f28-2x-macro-xf"),
]);

// Fields excluded from the spec similarity comparison.
// Identifiers, human-readable labels, links, and freeform notes are excluded;
// all measurable optical/physical fields are included automatically.
const SIMILARITY_EXCLUDE = new Set([
  "id", "brand", "model", "series", "officialLinks", "fieldNotes",
]);

// Threshold above which two same-brand lenses are flagged as suspiciously similar.
// Calibrated against the full catalog: the two legitimate high-scoring pairs sit
// at 0.895 and 0.870; the next-highest unrelated pair is 0.762.
const SPEC_SIMILARITY_THRESHOLD = 0.85;

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function normalizeForComparison(v: unknown): JsonValue {
  if (Array.isArray(v)) {
    return (v as unknown[])
      .map(normalizeForComparison)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (v !== null && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, w]) => [k, normalizeForComparison(w)])
    );
  }
  return v as JsonValue;
}

function specSimilarity(
  a: Lens,
  b: Lens,
): { score: number; equalFields: string[]; diffFields: string[] } {
  const ra = a as unknown as Record<string, unknown>;
  const rb = b as unknown as Record<string, unknown>;
  const keys = new Set([
    ...Object.keys(ra),
    ...Object.keys(rb),
  ].filter(k => !SIMILARITY_EXCLUDE.has(k)));

  const equalFields: string[] = [];
  const diffFields: string[] = [];
  let compared = 0;

  for (const k of keys) {
    const av = ra[k];
    const bv = rb[k];
    if (av === undefined || bv === undefined) continue;
    compared++;
    if (JSON.stringify(normalizeForComparison(av)) === JSON.stringify(normalizeForComparison(bv))) {
      equalFields.push(k);
    } else {
      diffFields.push(k);
    }
  }

  return {
    score: compared > 0 ? equalFields.length / compared : 0,
    equalFields,
    diffFields,
  };
}

export const lensCatalogSchema = z.array(lensSchema).superRefine((lenses, ctx) => {
  const seenIds = new Map<string, number>();
  const seenCnLinks = new Map<string, number>();
  const seenGlobalLinks = new Map<string, number>();
  const seenBrandModels = new Map<string, number>();

  // Group by brand for pairwise similarity comparison (within-brand only,
  // matching the scope of the previous tuple-based check).
  const byBrand = new Map<string, { lens: Lens; index: number }[]>();

  lenses.forEach((lens, index) => {
    const previousIndex = seenIds.get(lens.id);
    if (previousIndex !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate lens id "${lens.id}" also appears at index ${previousIndex}`,
        path: [index, "id"],
      });
      return;
    }

    seenIds.set(lens.id, index);

    if (lens.officialLinks.cn) {
      const previousCnIndex = seenCnLinks.get(lens.officialLinks.cn);
      if (previousCnIndex !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate officialLinks.cn also appears at index ${previousCnIndex}`,
          path: [index, "officialLinks", "cn"],
        });
      } else {
        seenCnLinks.set(lens.officialLinks.cn, index);
      }
    }

    if (lens.officialLinks.global) {
      const previousGlobalIndex = seenGlobalLinks.get(lens.officialLinks.global);
      if (previousGlobalIndex !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate officialLinks.global also appears at index ${previousGlobalIndex}`,
          path: [index, "officialLinks", "global"],
        });
      } else {
        seenGlobalLinks.set(lens.officialLinks.global, index);
      }
    }

    const brandModelKey = [
      lens.brand,
      lens.model,
      lens.generation ?? "<none>",
    ].join("|");
    const previousBrandModelIndex = seenBrandModels.get(brandModelKey);
    if (previousBrandModelIndex !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate brand/model/generation combination also appears at index ${previousBrandModelIndex}`,
        path: [index, "model"],
      });
    } else {
      seenBrandModels.set(brandModelKey, index);
    }

    const group = byBrand.get(lens.brand) ?? [];
    group.push({ lens, index });
    byBrand.set(lens.brand, group);
  });

  // Pairwise spec similarity check within each brand.
  for (const group of byBrand.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const { lens: a, index: ai } = group[i];
        const { lens: b, index: bj } = group[j];
        const { score, equalFields, diffFields } = specSimilarity(a, b);
        if (score < SPEC_SIMILARITY_THRESHOLD) continue;
        const pairKey = makeAllowlistKey(a.id, b.id);
        if (KNOWN_DISTINCT_PAIRS.has(pairKey)) continue;
        ctx.addIssue({
          code: "custom",
          message: [
            `Suspiciously similar specs (score=${score.toFixed(2)}) — also at index ${ai}.`,
            `  equal=[${equalFields.join(", ")}]`,
            `  diff=[${diffFields.length > 0 ? diffFields.join(", ") : "(none)"}]`,
            `  If confirmed distinct, add makeAllowlistKey("${a.id}", "${b.id}") to KNOWN_DISTINCT_PAIRS.`,
          ].join("\n"),
          path: [bj, "focalLengthMin"],
        });
      }
    }
  }
});

// Compile-time assertion: Lens interface and lensSchema's inferred type must stay
// bidirectionally compatible. A type error here means the two have drifted —
// update whichever definition is stale.
type _AssertExtends<T, U extends T> = true;
type _LensSchemaCheck = [
  _AssertExtends<Lens, z.infer<typeof lensSchema>>,
  _AssertExtends<z.infer<typeof lensSchema>, Lens>,
];

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    return `${path}: ${issue.message}`;
  });
}
