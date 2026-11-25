import { z } from "zod";

const textSchema = z.string().trim().min(1);

const mtfSeriesSchema = z.strictObject({
  label: textSchema.optional(),
  focalLengthMm: z.number().positive().optional(),
  aperture: z.number().positive().optional(),
  /** As the chart states it, with its unit; omitted when the chart gives none. */
  frequency: textSchema.optional(),
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
