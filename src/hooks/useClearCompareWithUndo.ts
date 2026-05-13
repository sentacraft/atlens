"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useMountedCompare } from "@/context/CompareProvider";

/**
 * Wraps `clearCompare` with an undo affordance: snapshots the current
 * compareIds, clears them, then surfaces a sonner toast whose action
 * restores the snapshot via `replaceCompare`. Used by every surface
 * that exposes a "clear" affordance for the comparison (nav link on
 * compare page, ComparePageHeader's "清空", CompareBar's "清空")
 * so the destructive action has a consistent reversal path.
 *
 * No-ops when `compareIds` is empty so callers don't need to
 * pre-check before invoking.
 *
 * The toast fires synchronously alongside the clear — the mobile
 * `AppToaster` is configured with a fixed bottom offset that sits
 * above the compare bar's resting position, so the two animations
 * (bar exiting downward, toast entering from below into a row above
 * where the bar was) don't share viewport real estate.
 */
export function useClearCompareWithUndo() {
  const tCompare = useTranslations("Compare");
  const { compareIds, clearCompare, replaceCompare } = useMountedCompare();

  return useCallback(() => {
    if (compareIds.length === 0) {
      return;
    }
    const prevIds = [...compareIds];
    clearCompare();
    toast(tCompare("clearedToast"), {
      action: {
        label: tCompare("undo"),
        onClick: () => replaceCompare(prevIds),
      },
    });
  }, [compareIds, clearCompare, replaceCompare, tCompare]);
}
