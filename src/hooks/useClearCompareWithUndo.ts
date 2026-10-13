"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCompare } from "@/context/CompareProvider";

// Undo uses `seed`, not `add`, so restored lenses do not fire compare_add again.
export function useClearCompareWithUndo() {
  const tCompare = useTranslations("Compare");
  const { compareIds, clear, seed } = useCompare();

  return useCallback(() => {
    if (compareIds.length === 0) {
      return;
    }
    const prevIds = [...compareIds];
    clear();
    toast(tCompare("clearedToast"), {
      action: {
        label: tCompare("undo"),
        onClick: () => seed(prevIds),
      },
    });
  }, [compareIds, clear, seed, tCompare]);
}
