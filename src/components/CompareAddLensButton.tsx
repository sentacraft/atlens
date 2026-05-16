"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import LensSearchDialog from "@/components/LensSearchDialog";
import { MAX_COMPARE } from "@/lib/lens";
import { useMountedCompare } from "@/context/CompareProvider";
import type { Lens } from "@/lib/types";

interface Props {
  triggerClassName?: string;
}

export default function CompareAddLensButton({ triggerClassName }: Props) {
  const t = useTranslations("Compare");
  const { compareIds, addToCompare } = useMountedCompare();

  const canAddMore = compareIds.length < MAX_COMPARE;

  const handleSelectLens = useCallback(
    (lens: Lens) => {
      addToCompare(lens.id);
    },
    [addToCompare]
  );

  const getResultState = useCallback(
    (candidate: Lens) => ({
      actionLabel: compareIds.includes(candidate.id)
        ? t("alreadyAdded")
        : compareIds.length >= MAX_COMPARE
          ? t("compareFull")
          : t("addToCompareAction"),
      disabled:
        compareIds.includes(candidate.id) ||
        compareIds.length >= MAX_COMPARE,
    }),
    [compareIds, t]
  );

  const btnClass =
    triggerClassName ??
    "h-9 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors";

  if (!canAddMore) {
    return (
      <button
        onClick={() => toast(t("compareFullHint"))}
        className={`${btnClass} border-zinc-200 bg-white text-zinc-400 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600`}
      >
        {t("addLens")}
      </button>
    );
  }

  return (
    <LensSearchDialog
      onSelectLens={handleSelectLens}
      getResultState={getResultState}
      triggerVariant="button"
      triggerLabel={t("addLens")}
      triggerClassName={`${btnClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900`}
    />
  );
}
