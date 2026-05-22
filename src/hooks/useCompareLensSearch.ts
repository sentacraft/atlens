"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCompare } from "@/context/CompareProvider";
import { MAX_COMPARE } from "@/lib/lens";
import type { Lens } from "@/lib/types";

/**
 * Backs the "+ add lens" affordance that opens a LensSearchDialog.
 * Used identically by the compare-bar's icon trigger, the compare-page
 * header button, and the compare-table empty-slot column — each call site
 * only supplies its own trigger styling.
 *
 * `canAddMore` is exposed for the one call site (`ComparePageHeader`)
 * that swaps the dialog for an inline toast hint when the slot is full;
 * other call sites can ignore it since the dialog's `getResultState`
 * already disables every row when the slot is full.
 */
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
