"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCompareUrl } from "@/hooks/useCompareUrl";
import { toast } from "sonner";
import LensSearchDialog from "@/components/LensSearchDialog";
import { MAX_COMPARE } from "@/lib/lens";
import type { Lens } from "@/lib/types";

interface Props {
  lenses: Lens[];
  triggerClassName?: string;
}

export default function CompareAddLensButton({ lenses, triggerClassName }: Props) {
  const t = useTranslations("Compare");
  const router = useRouter();
  const { buildCompareUrl } = useCompareUrl();

  const canAddMore = lenses.length < MAX_COMPARE;
  const currentIds = lenses.map((l) => l.id);

  const handleSelectLens = useCallback(
    (lens: Lens) => {
      if (currentIds.includes(lens.id) || currentIds.length >= MAX_COMPARE) {
        return;
      }
      const nextIds = [...currentIds, lens.id];
      router.replace(buildCompareUrl(nextIds));
    },
    [currentIds, router, buildCompareUrl]
  );

  const getResultState = useCallback(
    (candidate: Lens) => ({
      actionLabel: currentIds.includes(candidate.id)
        ? t("alreadyAdded")
        : currentIds.length >= MAX_COMPARE
          ? t("compareFull")
          : t("addToCompareAction"),
      disabled:
        currentIds.includes(candidate.id) ||
        currentIds.length >= MAX_COMPARE,
    }),
    [currentIds, t]
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
