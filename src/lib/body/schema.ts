import { z } from "zod";

// Relative .ts import: scripts/validate-bodies.mts runs under plain Node, which ignores tsconfig paths.
import { MOUNTS } from "../types.ts";

export const BODY_SERIES = ["X-H", "X-Pro", "X-T", "X-S", "X-E", "X-M", "X-A", "GFX"] as const;

export const BODY_SENSORS = [
  "X-Trans CMOS",
  "X-Trans CMOS II",
  "X-Trans CMOS III",
  "X-Trans CMOS 4",
  "X-Trans CMOS 5 HR",
  "X-Trans CMOS 5 HS",
  "APS-C Bayer CMOS",
  "GFX 51.4MP CMOS",
  "GFX 102MP BSI CMOS",
  "GFX 102MP CMOS II",
  "GFX 102MP CMOS II HS",
] as const;

export const bodySchema = z
  .strictObject({
    id: z
      .string()
      .regex(/^fujifilm-[a-z0-9]+(-[a-z0-9]+)*$/)
      .describe('Stable slug, "fujifilm-" plus the lowercased model name, e.g. "fujifilm-x-t30-ii".'),
    name: z.string().trim().min(1).describe('Model name as Fujifilm writes it, e.g. "X-T30 II".'),
    aliases: z
      .array(z.string().trim().min(1))
      .optional()
      .describe("Other names users search by. Spacing, hyphen and case variants are matched without listing them."),
    series: z.enum(BODY_SERIES).describe("Product line."),
    mount: z.enum(MOUNTS).describe('"X" for APS-C X mount, "G" for GFX medium format.'),
    releaseYear: z.int().min(2012).max(2100).describe("Year the body first went on sale."),
    megapixels: z.number().positive().describe("Effective megapixels, one decimal place."),
    sensor: z.enum(BODY_SENSORS).describe("Sensor generation as Fujifilm names it."),
    ibis: z.boolean().describe("Has in-body image stabilization. Electronic-only stabilization is false."),
    weatherSealed: z
      .boolean()
      .optional()
      .describe("Marketed as weather resistant. Omit when the sources do not say."),
    weightGrams: z
      .int()
      .positive()
      .optional()
      .describe("Shooting weight including battery and memory card. Omit when no source publishes it on that basis."),
    discontinued: z
      .boolean()
      .describe("Missing from Fujifilm's current camera lineup as of the file's lineupCheckedAt date."),
    sources: z.array(z.url()).min(1).describe("Where the values above were taken from."),
  })
  .refine((body) => (body.mount === "G") === (body.series === "GFX"), {
    message: 'series "GFX" and mount "G" go together',
    path: ["series"],
  });

export const bodyCatalogSchema = z
  .strictObject({
    $schema: z.string().optional(),
    lineupCheckedAt: z.iso.date().describe("Date the discontinued flags were checked against lineupSource."),
    lineupSource: z.url().describe("Fujifilm's current camera lineup page."),
    bodies: z.array(bodySchema),
  })
  .superRefine((catalog, ctx) => {
    const seen = new Set<string>();
    catalog.bodies.forEach((body, index) => {
      if (seen.has(body.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate id ${body.id}`, path: ["bodies", index, "id"] });
      }
      seen.add(body.id);
    });
  });

export type Body = z.infer<typeof bodySchema>;
export type BodyCatalog = z.infer<typeof bodyCatalogSchema>;

export function bodyCatalogJsonSchema() {
  return z.toJSONSchema(bodyCatalogSchema, { io: "input" });
}
