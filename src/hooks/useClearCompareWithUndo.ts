"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useMountedCompare } from "@/context/CompareProvider";

/**
 * Delay (ms) between firing `clearCompare` and showing the undo toast.
 * Matches the approximate exit duration of `spring.snappy` used by
 * `CompareBar`'s AnimatePresence — when the user clears the comparison
 * from inside the bar, the bar slides down + the bottom-center toast
 * slides up. Without this delay they fight each other in the same
 * bottom region of the viewport. Staggering by one exit-animation
 * cycle lets the bar finish receding before the toast appears in the
 * now-clear area.
 *
 * On surfaces where the bar isn't mounted (compare page header, nav
 * link click on compare page) the delay is unnecessary but harmless —
 * the toast appears ~320ms later, still well within "instant
 * acknowledgement" perception.
 */
const COMPARE_BAR_EXIT_DELAY_MS = 320;

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
    setTimeout(() => {
      toast(tCompare("clearedToast"), {
        action: {
          label: tCompare("undo"),
          onClick: () => replaceCompare(prevIds),
        },
      });
    }, COMPARE_BAR_EXIT_DELAY_MS);
  }, [compareIds, clearCompare, replaceCompare, tCompare]);
}
