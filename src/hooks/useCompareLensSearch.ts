"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCompare } from "@/context/CompareProvider";
import { MAX_COMPARE } from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";
import { suggestMissingLens } from "@/components/browse/LensSearchDialog";

/** The lens search dialog's props for adding lenses to compare, plus its open state. */
export function useCompareLensSearch() {
  const { compareIds, add } = useCompare();
  const t = useTranslations("Compare");
  const [open, setOpen] = useState(false);
  const full = compareIds.length >= MAX_COMPARE;

  return {
    canAddMore: !full,
    openSearch: () => setOpen(true),
    dialogProps: {
      open,
      onOpenChange: setOpen,
      title: t("addLens"),
      resultAction: (lens: Lens) =>
        compareIds.includes(lens.id)
          ? { label: t("alreadyAdded"), disabled: true }
          : full
            ? { label: t("compareFull"), disabled: true }
            : { label: t("addToCompareAction") },
      onSelect: (lens: Lens) => {
        setOpen(false);
        add(lens.id);
      },
      afterResults: suggestMissingLens,
    },
  };
}
