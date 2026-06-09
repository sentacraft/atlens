"use client";

import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { useCompare } from "@/context/CompareProvider";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";

interface Props {
  lensId: string;
}

export default function LensDetailCompareToggle({ lensId }: Props) {
  const t = useTranslations("LensDetail");
  const { compareIds, toggle } = useCompare();

  const isSelected = compareIds.includes(lensId);
  const isFull = !isSelected && compareIds.length >= MAX_COMPARE;

  return (
    <button
      onClick={() => toggle(lensId)}
      disabled={isFull}
      className={`inline-flex h-10 items-center gap-1.5 text-sm font-medium px-4 rounded-lg transition-colors ${
        isSelected
          ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          : ACTION_PRIMARY_CLS
      }`}
    >
      {isSelected ? <Check size={14} /> : !isFull && <Plus size={14} />}
      {isSelected ? t("removeFromCompare") : isFull ? t("compareFull") : t("addToCompare")}
    </button>
  );
}
