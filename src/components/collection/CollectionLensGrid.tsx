"use client";

import { useMemo, useState } from "react";
import LensCard from "@/components/lens/LensCard";
import { LENS_GRID_CLS } from "@/config/ui-tokens";
import LensSortControl from "@/components/browse/LensSortControl";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import { MAX_COMPARE, sortLenses, type SortKey } from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";

const SORT_MIN_LENSES = 5;

export default function CollectionLensGrid({ lenses }: { lenses: Lens[] }) {
  const hookAttr = useUiHookAttr();
  const { compareIds, toggle } = useCompare();
  const [sort, setSort] = useState<SortKey>("focalLength");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const displayed = useMemo(
    () => sortLenses(lenses, sort, sortDir),
    [lenses, sort, sortDir],
  );

  if (lenses.length === 0) {
    return null;
  }

  return (
    <>
      {lenses.length >= SORT_MIN_LENSES && (
        <div className="mb-4 flex justify-end">
          <LensSortControl
            sort={sort}
            sortDir={sortDir}
            onSortChange={setSort}
            onToggleDir={() =>
              setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
            }
          />
        </div>
      )}
      <div
        {...hookAttr("grid")}
        className={LENS_GRID_CLS}
      >
        {displayed.map((lens, i) => (
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
    </>
  );
}
