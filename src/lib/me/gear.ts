import "server-only";

import { getBodyById } from "@/lib/body/data";
import { getLensById } from "@/lib/lens/data";
import { normalizeBrand } from "@/lib/lens/search";
import type { NewGearItem } from "@/lib/me/gear-repository";
import type { GearInput } from "@/lib/me/gear-schema";

/** Fills the stored name, brand and mount from the catalog; undefined for an unknown catalog id. */
export function resolveGearInput(input: GearInput): NewGearItem | undefined {
  if ("manual" in input) {
    const brand = normalizeBrand(input.manual.brand);
    return {
      kind: "lens",
      name: input.manual.model,
      brand,
      mount: input.manual.mount,
      manual: { ...input.manual, brand },
    };
  }
  if (input.kind === "body") {
    const body = getBodyById(input.catalogId);
    return body && { kind: "body", catalogId: body.id, name: body.name, brand: "fujifilm", mount: body.mount };
  }
  const lens = getLensById(input.catalogId);
  return lens && { kind: "lens", catalogId: lens.id, name: lens.model, brand: lens.brand, mount: lens.mount };
}
