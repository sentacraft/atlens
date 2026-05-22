"use client";

import { useTranslations } from "next-intl";
import { useCompare } from "@/context/CompareProvider";
import { MAX_COMPARE } from "@/lib/lens";
import { ACTION_PRIMARY_CLS } from "@/lib/ui-tokens";

interface Props {
  lensId: string;
}

export default function AddToCompareButton({ lensId }: Props) {
  const t = useTranslations("LensDetail");
  const { compareIds, toggle } = useCompare();

  const isSelected = compareIds.includes(lensId);
  const isFull = !isSelected && compareIds.length >= MAX_COMPARE;

  return (
    <button
      onClick={() => toggle(lensId)}
      disabled={isFull}
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
        isSelected
          ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          : ACTION_PRIMARY_CLS
      }`}
    >
      {isSelected ? t("removeFromCompare") : isFull ? t("compareFull") : t("addToCompare")}
    </button>
  );
}
