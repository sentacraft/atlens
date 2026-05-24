"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCompare } from "@/context/CompareProvider";

/**
 * Wraps the clear action with an undo affordance: snapshots the current
 * compareIds, dispatches clear, then surfaces a sonner toast whose action
 * restores the snapshot via a `seed` action (not `add` — those lenses were
 * already tracked when first added; re-counting them on undo would double-
 * fire the `compare_add` event).
 *
 * No-ops when `compareIds` is empty so callers don't need to pre-check
 * before invoking.
 *
 * The toast fires synchronously alongside the clear — the mobile
 * `AppToaster` is configured with a fixed bottom offset that sits above
 * the compare bar's resting position, so the two animations (bar exiting
 * downward, toast entering from below into a row above where the bar was)
 * don't share viewport real estate.
 */
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
