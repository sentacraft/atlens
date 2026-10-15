import { z } from "zod";
import { getBodyById } from "@/lib/body/data";
import { getLensById } from "@/lib/lens/data";
import { focalRangeDisplay, primaryApertureDisplay } from "@/lib/lens/format";
import { lensRef } from "@/lib/ai/lens-ref";
import { equivalentFocal } from "@/lib/me/coverage";
import type { GearItem } from "@/lib/me/gear-schema";
import type { Mount } from "@/lib/types";

/** What Iris knows about the user's gear this turn. */
export type GearStatus =
  | { kind: "guest" }
  | { kind: "unavailable" }
  | { kind: "account"; gear: GearItem[] };

export interface GearBody {
  name: string;
  /** Absent for a body that is no longer in the catalog. */
  sensor?: Mount;
  megapixels?: number;
  ibis?: boolean;
}

export interface GearLens {
  name: string;
  /** The catalog ref Iris links with; absent for a manual entry. */
  ref?: string;
  focal?: string;
  equivalent?: string;
  aperture?: string;
  manual: boolean;
  adapted: boolean;
  originalMount?: string;
}

/** The gear facts the prompt renders; language-free so all model-facing wording stays in system-prompt.ts. */
export type GearSummary =
  | { known: false; reason: "guest" | "empty" | "unavailable" }
  | { known: true; bodies: GearBody[]; lenses: GearLens[] };

function equivalentRange(min: number, max: number, mount: Mount): string {
  return focalRangeDisplay(equivalentFocal(min, mount), equivalentFocal(max, mount));
}

function describeBody(item: GearItem, brandName: (slug: string) => string): GearBody {
  const body = item.catalogId ? getBodyById(item.catalogId) : undefined;
  if (!body) {
    return { name: `${brandName(item.brand)} ${item.name}` };
  }
  return { name: `${brandName(item.brand)} ${body.name}`, sensor: body.mount, megapixels: body.megapixels, ibis: body.ibis };
}

function describeLens(item: GearItem, brandName: (slug: string) => string): GearLens {
  if (item.manual) {
    const lens = item.manual;
    return {
      name: `${lens.brand} ${lens.model}`,
      focal: focalRangeDisplay(lens.focalMinMm, lens.focalMaxMm),
      equivalent: equivalentRange(lens.focalMinMm, lens.focalMaxMm, lens.mount),
      aperture:
        lens.maxApertureWide === undefined
          ? undefined
          : `f/${lens.maxApertureWide}${lens.maxApertureTele === undefined ? "" : `–${lens.maxApertureTele}`}`,
      manual: true,
      adapted: lens.adapted === true,
      originalMount: lens.originalMount,
    };
  }
  const lens = item.catalogId ? getLensById(item.catalogId) : undefined;
  if (!lens) {
    return { name: `${brandName(item.brand)} ${item.name}`, manual: false, adapted: false };
  }
  return {
    name: `${brandName(lens.brand)} ${lens.model}`,
    ref: lensRef(lens.id),
    focal: focalRangeDisplay(lens.focalLengthMin, lens.focalLengthMax),
    equivalent: equivalentRange(lens.focalLengthMin, lens.focalLengthMax, lens.mount),
    aperture: primaryApertureDisplay(lens),
    manual: false,
    adapted: false,
  };
}

export function describeGear(status: GearStatus, brandName: (slug: string) => string): GearSummary {
  if (status.kind === "guest" || status.kind === "unavailable") {
    return { known: false, reason: status.kind };
  }
  if (status.gear.length === 0) {
    return { known: false, reason: "empty" };
  }
  return {
    known: true,
    bodies: status.gear.filter((item) => item.kind === "body").map((item) => describeBody(item, brandName)),
    lenses: status.gear.filter((item) => item.kind === "lens").map((item) => describeLens(item, brandName)),
  };
}

/** Development-only request header the eval suite uses to give a turn a gear profile. */
export const EVAL_GEAR_HEADER = "x-askiris-eval-gear";

const evalGearSchema = z.strictObject({
  bodies: z.array(z.string()).default([]),
  lenses: z.array(z.string()).default([]),
});

/** Catalog ids from the eval header as gear items; unknown ids are dropped. */
export function evalGear(header: string | null): GearItem[] | undefined {
  if (!header) {
    return undefined;
  }
  let parsed;
  try {
    parsed = evalGearSchema.safeParse(JSON.parse(header));
  } catch {
    return undefined;
  }
  if (!parsed.success) {
    return undefined;
  }
  const bodies = parsed.data.bodies.flatMap((id): GearItem[] => {
    const body = getBodyById(id);
    return body
      ? [{ id: `eval-${id}`, kind: "body", catalogId: id, name: body.name, brand: "fujifilm", mount: body.mount, createdAt: 0 }]
      : [];
  });
  const lenses = parsed.data.lenses.flatMap((id): GearItem[] => {
    const lens = getLensById(id);
    return lens
      ? [{ id: `eval-${id}`, kind: "lens", catalogId: id, name: lens.model, brand: lens.brand, mount: lens.mount, createdAt: 0 }]
      : [];
  });
  return [...bodies, ...lenses];
}
