"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import LensSearchDialog from "@/components/LensSearchDialog";
import { useCompareLensSearch } from "@/hooks/useCompareLensSearch";

interface Props {
  triggerClassName?: string;
}

export default function CompareLensPicker({ triggerClassName }: Props) {
  const t = useTranslations("Compare");
  const { onSelectLens, getResultState, canAddMore } = useCompareLensSearch();

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
      onSelectLens={onSelectLens}
      getResultState={getResultState}
      triggerVariant="button"
      triggerLabel={t("addLens")}
      triggerClassName={`${btnClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900`}
    />
  );
}
