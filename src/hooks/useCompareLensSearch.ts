"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCompare } from "@/context/CompareProvider";
import { MAX_COMPARE } from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";

export function useCompareLensSearch() {
  const { compareIds, add } = useCompare();
  const t = useTranslations("Compare");

  const onSelectLens = (lens: Lens) => add(lens.id);

  const getResultState = useCallback(
    (candidate: Lens) => {
      const alreadyIn = compareIds.includes(candidate.id);
      const full = compareIds.length >= MAX_COMPARE;
      return {
        actionLabel: alreadyIn
          ? t("alreadyAdded")
          : full
            ? t("compareFull")
            : t("addToCompareAction"),
        disabled: alreadyIn || full,
      };
    },
    [compareIds, t],
  );

  return {
    onSelectLens,
    getResultState,
    canAddMore: compareIds.length < MAX_COMPARE,
  };
}
