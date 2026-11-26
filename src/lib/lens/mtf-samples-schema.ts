import { z } from "zod";

import type { LensImageAsset } from "../types.ts";

const textSchema = z.string().trim().min(1);

const mtfSeriesSchema = z.strictObject({
  label: textSchema.optional(),
  focalLengthMm: z.number().positive().optional(),
  aperture: z.number().positive().optional(),
  /** Omitted when the chart gives no unit. */
  frequency: z.strictObject({
    value: z.number().positive(),
    unit: z.enum(["lines/mm", "lp/mm"]),
  }).optional(),
  /** Horizontal positions on the chart's own axis. */
  x: z.array(z.number()).min(1),
  curves: z.array(z.strictObject({
    name: textSchema,
    values: z.array(z.number().min(0).max(1).nullable()).min(1),
  })).min(1),
}).refine(
  ({ x, curves }) => curves.every(({ values }) => values.length === x.length),
  "Each curve needs one value per x position",
);

const mtfChartSamplesSchema = z.strictObject({
  /** What the x positions measure, including that a unit is not stated. */
  axis: textSchema,
  /**
   * Limits of the reading itself: unreadable segments, ambiguous traces, estimated positions.
   * The chart's test conditions belong in the catalog image's `conditionsNote`; do not repeat them here.
   */
  limitations: z.array(textSchema).min(1).optional(),
  series: z.array(mtfSeriesSchema).min(1),
});

/**
 * Approximate readings of manufacturer MTF charts, keyed by lens id and then image id.
 * They are given to Ask Iris only and are kept out of the catalog so they never reach a page.
 */
export const mtfSamplesSchema = z.record(textSchema, z.record(textSchema, mtfChartSamplesSchema));

export type MtfSamples = z.infer<typeof mtfSamplesSchema>;
export type MtfChartSamples = z.infer<typeof mtfChartSamplesSchema>;

/** The `lensId/imageId` keys that name no MTF chart in the catalog. */
export function orphanedMtfSamples(
  samples: MtfSamples,
  lenses: { id: string; images?: { id: string; role: string }[] }[],
): string[] {
  const charts = new Set(lenses.flatMap((lens) =>
    (lens.images ?? []).filter((image) => image.role === "mtf").map((image) => `${lens.id}/${image.id}`)));
  return Object.entries(samples)
    .flatMap(([lensId, images]) => Object.keys(images).map((imageId) => `${lensId}/${imageId}`))
    .filter((key) => !charts.has(key));
}

/** Series conditions that the chart's catalog image does not confirm, one message each. */
export function mtfSampleConflicts(
  samples: MtfSamples,
  lenses: {
    id: string;
    images?: Pick<LensImageAsset, "id" | "role" | "focalLengthMm" | "apertureFNumbers" | "spatialFrequency">[];
  }[],
): string[] {
  return lenses.flatMap((lens) => (lens.images ?? []).flatMap((image) => {
    const chart = image.role === "mtf" ? samples[lens.id]?.[image.id] : undefined;
    return (chart?.series ?? []).flatMap(({ frequency, aperture, focalLengthMm }, index) => {
      const conflicts: string[] = [];
      const conflict = (field: string, reading: string, catalog: unknown) => conflicts.push(
        `${lens.id}/${image.id}: series[${index}].${field} is ${reading}, catalog image has ${JSON.stringify(catalog) ?? "none"}`);
      if (frequency && !(image.spatialFrequency?.unit === frequency.unit
        && image.spatialFrequency.values.includes(frequency.value))) {
        conflict("frequency", `${frequency.value} ${frequency.unit}`, image.spatialFrequency);
      }
      if (aperture !== undefined && !image.apertureFNumbers?.includes(aperture)) {
        conflict("aperture", `${aperture}`, image.apertureFNumbers);
      }
      if (focalLengthMm !== undefined && image.focalLengthMm !== focalLengthMm) {
        conflict("focalLengthMm", `${focalLengthMm}`, image.focalLengthMm);
      }
      return conflicts;
    });
  }));
}
