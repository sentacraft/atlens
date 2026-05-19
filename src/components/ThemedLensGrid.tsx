"use client";

import LensCard from "@/components/LensCard";
import { useUiHookAttr } from "@/context/TestHookProvider";
import type { Lens } from "@/lib/types";

/**
 * Compact grid renderer for theme / pSEO landing pages. Same card visual
 * as the main /lenses/{mount} browse grid, but with no filter / sort /
 * search UI and no compare entry — themed pages are curated browsing
 * destinations per the pSEO plan, not interactive exploration surfaces.
 */
export default function ThemedLensGrid({ lenses }: { lenses: Lens[] }) {
  const hookAttr = useUiHookAttr();

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
          isSelected={false}
          selectionDisabled
          onToggle={() => {}}
          priority={i < 8}
          hideCompare
          placeholderClickable={false}
        />
      ))}
    </div>
  );
}
