import { z } from "zod";
import { MOUNTS, OPTICAL_TRAITS } from "@/lib/types";

export const FOCUS_MOTORS = ["linear", "stepping", "dc", "other", "unknown"] as const;
export const LENS_USAGES = ["photo", "cine"] as const;

const apertureSchema = z.number().min(0.7).max(64);

export const manualLensSchema = z
  .strictObject({
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(120),
    mount: z.enum(MOUNTS),
    focalMinMm: z.number().positive().max(2000),
    focalMaxMm: z.number().positive().max(2000),
    maxApertureWide: apertureSchema.optional(),
    maxApertureTele: apertureSchema.optional(),
    autofocus: z.boolean().optional(),
    ois: z.boolean().optional(),
    adapted: z.boolean().optional(),
    originalMount: z.string().trim().min(1).max(40).optional(),
    weatherResistant: z.boolean().optional(),
    apertureRing: z.boolean().optional(),
    powerZoom: z.boolean().optional(),
    internalZoom: z.boolean().optional(),
    opticalTraits: z.array(z.enum(OPTICAL_TRAITS)).max(OPTICAL_TRAITS.length).optional(),
    usage: z.enum(LENS_USAGES).optional(),
    focusMotor: z.enum(FOCUS_MOTORS).optional(),
    weightG: z.int().positive().max(20000).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((lens, ctx) => {
    if (lens.focalMinMm > lens.focalMaxMm) {
      ctx.addIssue({ code: "custom", message: "focalMinMm must not exceed focalMaxMm", path: ["focalMinMm"] });
    }
    if (lens.maxApertureTele !== undefined) {
      if (lens.maxApertureWide === undefined) {
        ctx.addIssue({ code: "custom", message: "maxApertureTele needs maxApertureWide", path: ["maxApertureTele"] });
      } else if (lens.maxApertureTele < lens.maxApertureWide) {
        ctx.addIssue({ code: "custom", message: "maxApertureTele must not be below maxApertureWide", path: ["maxApertureTele"] });
      }
    }
    const isZoom = lens.focalMinMm < lens.focalMaxMm;
    for (const key of ["powerZoom", "internalZoom"] as const) {
      if (!isZoom && lens[key] !== undefined) {
        ctx.addIssue({ code: "custom", message: `${key} applies to zoom lenses only`, path: [key] });
      }
    }
    if (lens.originalMount !== undefined && lens.adapted !== true) {
      ctx.addIssue({ code: "custom", message: "originalMount needs adapted: true", path: ["originalMount"] });
    }
  });

export type ManualLens = z.infer<typeof manualLensSchema>;

const catalogIdSchema = z.string().trim().min(1).max(200);

export const gearInputSchema = z.union([
  z.strictObject({ kind: z.enum(["body", "lens"]), catalogId: catalogIdSchema }),
  z.strictObject({ kind: z.literal("lens"), manual: manualLensSchema }),
]);

export type GearInput = z.infer<typeof gearInputSchema>;

export type GearKind = "body" | "lens";

export interface GearItem {
  id: string;
  kind: GearKind;
  /** Absent for a manual entry. */
  catalogId?: string;
  /** Snapshot taken when the item was added, so it still displays if the catalog entry is renamed or removed. */
  name: string;
  /** Catalog brand slug, or the brand the user typed. */
  brand: string;
  mount: (typeof MOUNTS)[number];
  manual?: ManualLens;
  createdAt: number;
}
