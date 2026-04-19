"use client";

import { useTranslations } from "next-intl";
import { useCompare } from "@/context/CompareProvider";
import { ACTION_PRIMARY_CLS } from "@/lib/ui-tokens";

interface Props {
  lensId: string;
}

export default function AddToCompareButton({ lensId }: Props) {
  const t = useTranslations("LensDetail");
  const { compareIds, toggleCompare, canToggle } = useCompare();

  const isSelected = compareIds.includes(lensId);
  const disabled = !isSelected && !canToggle(lensId);

  return (
    <button
      onClick={() => toggleCompare(lensId)}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
        isSelected
          ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          : ACTION_PRIMARY_CLS
      }`}
    >
      {isSelected ? t("removeFromCompare") : t("addToCompare")}
    </button>
  );
}
