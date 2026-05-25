"use client";

import LensCard from "@/components/LensCard";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import { MAX_COMPARE } from "@/lib/lens";
import type { Lens } from "@/lib/types";

export default function CollectionLensGrid({ lenses }: { lenses: Lens[] }) {
  const hookAttr = useUiHookAttr();
  const { compareIds, toggle } = useCompare();

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
          selectionDisabled={
            !compareIds.includes(lens.id) &&
            compareIds.length >= MAX_COMPARE
          }
          onToggle={toggle}
          priority={i < 8}
        />
      ))}
    </div>
  );
}
