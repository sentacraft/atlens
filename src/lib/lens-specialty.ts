import { OPTICAL_TRAITS } from "./types";
import type { Lens, OpticalTrait } from "./types";

const OPTICAL_TRAIT_SET = new Set<string>(OPTICAL_TRAITS);

/**
 * Normalizes a lens's specialty signals into the new schema shape regardless
 * of whether the underlying record uses the new fields (isCine + opticalTraits)
 * or only the legacy specialtyTags array.
 *
 * During the schema migration window the consumer side reads either, and
 * "ultra_macro" — which was removed as a distinct trait — collapses into
 * plain macro on display.
 */
export function deriveSpecialty(
  lens: Pick<Lens, "isCine" | "opticalTraits" | "specialtyTags">,
): { isCine: boolean; opticalTraits: OpticalTrait[] } {
  if (lens.isCine !== undefined || lens.opticalTraits !== undefined) {
    return {
      isCine: lens.isCine === true,
      opticalTraits: lens.opticalTraits ?? [],
    };
  }
  const tags = lens.specialtyTags ?? [];
  const opticalTraits = tags.filter((t): t is OpticalTrait =>
    t !== "cine" && t !== "ultra_macro" && OPTICAL_TRAIT_SET.has(t),
  );
  return {
    isCine: tags.includes("cine"),
    opticalTraits,
  };
}
