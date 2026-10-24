"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import LensCard from "@/components/lens/LensCard";
import { LENS_GRID_CLS } from "@/config/ui-tokens";
import LensSortControl from "@/components/browse/LensSortControl";
import SegmentedControl from "@/components/ui/segmented-control";
import { WeightRankList } from "@/components/charts/WeightLadderChart";
import { useCompare } from "@/context/CompareProvider";
import { useUiHookAttr } from "@/context/TestHookProvider";
import type { LadderRow } from "@/lib/charts/weight";
import { MAX_COMPARE, sortLenses, type SortKey } from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";
import { projectToUrl } from "@/lib/url/projection";
import { readCollectionView, writeCollectionView, type CollectionView } from "@/lib/url/collection-view";
import { cn } from "@/lib/utils";

const SORT_MIN_LENSES = 5;

type Props = {
  lenses: Lens[];
  /** Present where the page offers its lenses ranked by weight as well as cards. */
  weightRanking?: LadderRow[];
  initialView?: CollectionView;
};

export function CollectionLensGridFromUrl(props: Omit<Props, "initialView">) {
  return <CollectionLensGrid {...props} initialView={readCollectionView(useSearchParams().get("view"))} />;
}

export default function CollectionLensGrid({ lenses, weightRanking, initialView = "cards" }: Props) {
  const t = useTranslations("Charts");
  const hookAttr = useUiHookAttr();
  const { compareIds, toggle } = useCompare();
  const [sort, setSort] = useState<SortKey>("focalLength");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [view, setView] = useState<CollectionView>(weightRanking ? initialView : "cards");

  const displayed = useMemo(
    () => sortLenses(lenses, sort, sortDir),
    [lenses, sort, sortDir],
  );

  if (lenses.length === 0) {
    return null;
  }

  const showSort = view === "cards" && lenses.length >= SORT_MIN_LENSES;
  return (
    <>
      {(weightRanking || showSort) && (
        <div className={cn("mb-4 flex items-center gap-3", weightRanking ? "justify-between" : "justify-end")}>
          {weightRanking && (
            <SegmentedControl<CollectionView>
              ariaLabel={t("viewLabel")}
              layout="paired"
              value={view}
              onChange={(next) => {
                setView(next);
                projectToUrl((url) => writeCollectionView(url, next));
              }}
              options={[
                { value: "cards", label: { default: t("viewCards") } },
                { value: "weight", label: { default: t("viewWeight") } },
              ]}
            />
          )}
          {showSort && (
            <LensSortControl
              sort={sort}
              sortDir={sortDir}
              onSortChange={setSort}
              onToggleDir={() =>
                setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
              }
            />
          )}
        </div>
      )}
      {view === "weight" && weightRanking ? (
        <WeightRankList rows={weightRanking} />
      ) : (
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
      )}
    </>
  );
}
