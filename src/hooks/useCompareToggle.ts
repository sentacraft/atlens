"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCompare } from "@/context/CompareProvider";
import { COMPARE_CHIP_STATE_CLS } from "@/config/ui-tokens";
import { MAX_COMPARE } from "@/lib/lens/lens";

/** The add-to-compare control's state for one lens, with the full-list case turned into a toast. */
export function useCompareToggle(lensId: string) {
  const tList = useTranslations("LensList");
  const { compareIds, toggle } = useCompare();
  const selected = compareIds.includes(lensId);
  const full = !selected && compareIds.length >= MAX_COMPARE;
  return {
    selected,
    stateCls: COMPARE_CHIP_STATE_CLS[selected ? "selected" : full ? "full" : "idle"],
    label: selected ? tList("removeFromCompare") : full ? tList("compareFull") : tList("addToCompare"),
    onToggle: full ? () => toast(tList("compareFullToast")) : () => toggle(lensId),
  };
}
