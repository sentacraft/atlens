import type { Lens, OpticalTrait } from "@/lib/types";

export function deriveSpecialty(
  lens: Pick<Lens, "isCine" | "opticalTraits">,
): { isCine: boolean; opticalTraits: OpticalTrait[] } {
  return {
    isCine: lens.isCine === true,
    opticalTraits: lens.opticalTraits ?? [],
  };
}
