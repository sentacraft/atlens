"use client";

import LensCard from "@/components/LensCard";
import { useMountedCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import type { Lens } from "@/lib/types";

/**
 * Compact grid renderer for theme / pSEO landing pages. Same card visual
 * as the main /lenses/{mount} browse grid, but with no filter / sort /
 * search UI — themed pages are curated browsing destinations per the pSEO
 * plan, not interactive exploration surfaces.
 */
export default function ThemedLensGrid({ lenses }: { lenses: Lens[] }) {
  const hookAttr = useUiHookAttr();
  const { compareIds, toggleCompare, canToggle } = useMountedCompare();

  if (lenses.length === 0) {
    return null;
  }

  return (
    <div
      {...hookAttr("grid")}
      className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
    >
      {lenses.map((lens, i) => (
        <LensCard
          key={lens.id}
          lens={lens}
          isSelected={compareIds.includes(lens.id)}
          selectionDisabled={!canToggle(lens.id)}
          onToggle={() => toggleCompare(lens.id)}
          priority={i < 8}
        />
      ))}
    </div>
  );
}
