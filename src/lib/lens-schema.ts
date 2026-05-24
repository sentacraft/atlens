import { z } from "zod";

import { FIELD_NOTE_KEYS, OPTICAL_TRAITS, SPEC_NA } from "./types.ts";
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
const opticalTraitSchema = z.enum(OPTICAL_TRAITS);
export const specNaSchema = z.literal(SPEC_NA);
const lensPriceEntrySchema = z.strictObject({
  price: z.number().positive(),
  currency: z.enum(["CNY", "USD"]),
  source: z.string().min(1),
  sampledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const pricingMarketSchema = z.strictObject({
  new: lensPriceEntrySchema.optional(),
  used: lensPriceEntrySchema.optional(),
});

export const focusDistanceModeSchema = z.strictObject({
  cm: positiveNumberSchema,
  teleCm: positiveNumberSchema.optional(),
});

export const magnificationVariantsSchema = z.strictObject({
  wide: positiveNumberSchema.optional(),
  tele: positiveNumberSchema.optional(),
});

const lensBaseShape = {
  id: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brand: nonEmptyStringSchema,
  mount: z.enum(["X", "G"]),
  series: optionalNonEmptyStringSchema,
  model: nonEmptyStringSchema,
  generation: z.number().int().positive().optional(),
  focalLengthMin: positiveNumberSchema,
  focalLengthMax: positiveNumberSchema,
  maxAperture: maxApertureSchema.optional(),
  minAperture: minApertureSchema.optional(),
  maxTStop: maxTStopSchema.optional(),
  minTStop: minTStopSchema.optional(),
  isCine: z.boolean().optional(),
  opticalTraits: z.array(opticalTraitSchema).min(1).optional(),
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
    normal: focusDistanceModeSchema,
    macro: focusDistanceModeSchema.optional(),
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
  searchAliases: z.strictObject({
    en: nonEmptyStringSchema,
    zh: nonEmptyStringSchema.optional(),
  }),
  pricing: z.strictObject({
    cn: pricingMarketSchema.optional(),
    global: pricingMarketSchema.optional(),
  }).optional(),
  purchaseChannels: z.array(z.strictObject({
    channel: z.enum(['official', 'ebay', 'bhphoto']),
    url: nonEmptyStringSchema.optional(),
  })).min(1).optional(),
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
// Keys mirror FIELD_NOTE_KEYS in types.ts — keep both in lockstep. The static
// `_AssertFieldNotesShape` below produces a compile-time error if a key gets
// added to FIELD_NOTE_KEYS but not to this schema (or vice versa).
const fieldNotesSchema = z.strictObject({
  wr: nonEmptyStringSchema.optional(),
  weightG: nonEmptyStringSchema.optional(),
  lengthMm: nonEmptyStringSchema.optional(),
  diameterMm: nonEmptyStringSchema.optional(),
  filterMm: nonEmptyStringSchema.optional(),
  minFocusDistance: nonEmptyStringSchema.optional(),
  maxMagnification: nonEmptyStringSchema.optional(),
  lensConfiguration: nonEmptyStringSchema.optional(),
  ois: nonEmptyStringSchema.optional(),
  focusMotor: nonEmptyStringSchema.optional(),
  apertureRing: nonEmptyStringSchema.optional(),
  maxAperture: nonEmptyStringSchema.optional(),
  minAperture: nonEmptyStringSchema.optional(),
  apertureBladeCount: nonEmptyStringSchema.optional(),
});

// Compile-time check: the zod schema's keys must equal FIELD_NOTE_KEYS exactly.
// If either set has a key the other lacks, _AssertExtra/_AssertMissing resolves
// to a tuple type that fails to assign to `true`, triggering a TS error.
type _AssertTrue<T extends true> = T;
type _FieldNotesSchemaKeys = keyof z.infer<typeof fieldNotesSchema>;
type _FieldNoteKeyConst = (typeof FIELD_NOTE_KEYS)[number];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AssertNoExtraInSchema = _AssertTrue<
  Exclude<_FieldNotesSchemaKeys, _FieldNoteKeyConst> extends never ? true : false
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AssertNoMissingInSchema = _AssertTrue<
  Exclude<_FieldNoteKeyConst, _FieldNotesSchemaKeys> extends never ? true : false
>;

const localeTranslationsSchema = z.strictObject({
  fieldNotes: fieldNotesSchema.optional(),
  lensMaterial: nonEmptyStringSchema.optional(),
  accessories: z.array(nonEmptyStringSchema).optional(),
});

const lensObjectSchema = z.strictObject({
  ...lensBaseShape,
  filterMm: z.union([positiveNumberSchema, specNaSchema]).optional(),
  lensConfiguration: lensConfigurationSchema.optional(),
  fieldNotes: fieldNotesSchema.optional(),
  officialLinks: officialLinksSchema,
  translations: z.strictObject({ zh: localeTranslationsSchema.optional() }).optional(),
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

// Pairs of lens IDs confirmed to be distinct despite scoring above the spec
// similarity threshold. Also used by the pipeline image dedupe gate.
// Format: "idA|idB" with IDs sorted alphabetically. Add a comment explaining
// what actually distinguishes the pair — the gate error output shows you the
// equalFields / diffFields diff to inform that decision.
function makeAllowlistKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
export const KNOWN_DISTINCT_PAIRS = new Set([
  // Tilt-shift mechanism adds tilt/shift axes; lensConfiguration and
  // opticalTraits differ even though optical formula is the same.
  makeAllowlistKey(
    "ttartisan-100mm-f28-2x-macro-x",
    "ttartisan-tilt-shift-100mm-f28-2x-macro-x"),
  // APD version adds apodization filter: same optical formula but different bokeh
  // rendering, ~1-stop light loss (T~1.7), and slower AF vs non-APD.
  makeAllowlistKey(
    "fujifilm-xf-56mmf12-r-apd-x",
    "fujifilm-xf-56mmf12-r-x"),
  // XC 50-230mm OIS II is visually identical to the original; shared raw image
  // is intentional, not a collect-stage error.
  makeAllowlistKey(
    "fujifilm-xc-50-230mmf45-67-ois-ii-x",
    "fujifilm-xc-50-230mmf45-67-ois-x"),
  // S 17mm is shift-only; TS 17mm adds an internal tilt mechanism (+40g).
  // Laowa sells them as separate SKUs sharing the same product page and
  // outer housing (same length/diameter, same optical formula). The diff
  // is opticalTraits ["shift"] vs ["tilt","shift"] and weight 770g vs 810g.
  makeAllowlistKey(
    "laowa-ff-s-17mmf4-c-dreamer-g",
    "laowa-ff-ts-17mmf4-c-dreamer-g"),
]);

// Fields excluded from the spec similarity comparison.
// Identifiers, human-readable labels, links, and freeform notes are excluded;
// all measurable optical/physical fields are included automatically.
const SIMILARITY_EXCLUDE = new Set([
  "id", "brand", "model", "series", "officialLinks", "fieldNotes", "translations", "searchAliases", "purchaseChannels",
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
    if (av === undefined || bv === undefined) {
      continue;
    }
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
        // Honor KNOWN_DISTINCT_PAIRS: pairs that legitimately share a product
        // page (e.g. Laowa S 17 / TS 17 are two SKUs on the same Tmall listing)
        // would otherwise need URL data stripped just to pass this gate.
        const pairKey = makeAllowlistKey(lens.id, lenses[previousCnIndex].id);
        if (!KNOWN_DISTINCT_PAIRS.has(pairKey)) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate officialLinks.cn also appears at index ${previousCnIndex}`,
            path: [index, "officialLinks", "cn"],
          });
        }
      } else {
        seenCnLinks.set(lens.officialLinks.cn, index);
      }
    }

    if (lens.officialLinks.global) {
      const previousGlobalIndex = seenGlobalLinks.get(lens.officialLinks.global);
      if (previousGlobalIndex !== undefined) {
        const pairKey = makeAllowlistKey(lens.id, lenses[previousGlobalIndex].id);
        if (!KNOWN_DISTINCT_PAIRS.has(pairKey)) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate officialLinks.global also appears at index ${previousGlobalIndex}`,
            path: [index, "officialLinks", "global"],
          });
        }
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
        if (score < SPEC_SIMILARITY_THRESHOLD) {
          continue;
        }
        const pairKey = makeAllowlistKey(a.id, b.id);
        if (KNOWN_DISTINCT_PAIRS.has(pairKey)) {
          continue;
        }
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- compile-time type assertion
type _AssertExtends<T, U extends T> = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- compile-time type assertion
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
