"use client";

import { useMemo, useState } from "react";
import LensCard from "@/components/lens/LensCard";
import LensSortControl from "@/components/lens/LensSortControl";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import { MAX_COMPARE, sortLenses, type SortKey } from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";

// A collection smaller than this fits within ~one desktop grid row, so sorting
// it is noise rather than help — hide the control below the threshold.
const SORT_MIN_LENSES = 5;

export default function CollectionLensGrid({ lenses }: { lenses: Lens[] }) {
  const hookAttr = useUiHookAttr();
  const { compareIds, toggle } = useCompare();
  // Local sort only — a collection is already a fixed membership set, so order
  // is purely a view concern and never touches the URL or server data path.
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
        className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
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
