import type { Lens, OpticalTrait } from "@/lib/types";

/**
 * Reads a lens's specialty signals (cine flag and optical traits) into a
 * normalised pair. Trivial wrapper today, but kept as the single shape that
 * the UI consumes so the call sites stay readable and future tweaks to how
 * specialty is derived have one place to land.
 */
export function deriveSpecialty(
  lens: Pick<Lens, "isCine" | "opticalTraits">,
): { isCine: boolean; opticalTraits: OpticalTrait[] } {
  return {
    isCine: lens.isCine === true,
    opticalTraits: lens.opticalTraits ?? [],
  };
}
