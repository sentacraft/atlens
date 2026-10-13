"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import LensSearchDialog from "@/components/browse/LensSearchDialog";
import { Flag } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import ShareFAB from "@/components/share/ShareFAB";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import { UTILITY_BTN_CLS } from "@/config/ui-tokens";
import { useCompare } from "@/context/CompareProvider";
import { useClearCompareWithUndo } from "@/hooks/useClearCompareWithUndo";
import { useCompareLensSearch } from "@/hooks/useCompareLensSearch";
import { findPresetByIds } from "@/lib/curated-presets";
import type { Lens } from "@/lib/types";
import { TEXT_LINK_CLS } from "@/config/ui-tokens";

const ADD_LENS_BTN_BASE =
  "h-9 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors";

export default function ComparePageHeader({ allLenses }: { allLenses: Lens[] }) {
  const t = useTranslations("Compare");
  const tList = useTranslations("LensList");
  const { compareIds } = useCompare();
  const { onSelectLens, getResultState, canAddMore } = useCompareLensSearch();
  const clearCompareWithUndo = useClearCompareWithUndo();
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";

  const activeLenses = compareIds
    .map((id) => allLenses.find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);

  const matchedPreset = useMemo(() => findPresetByIds(compareIds), [compareIds]);
  const presetTitle = matchedPreset?.title[lang];
  const presetSubtitle = matchedPreset?.subtitle[lang];

  const isEmpty = activeLenses.length === 0;

  return (
    <>
      <div className={`flex items-center gap-3 ${isEmpty ? "hidden sm:flex" : ""}`}>
        <h1 className="hidden sm:block text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
        {activeLenses.length >= 1 &&
          (canAddMore ? (
            <LensSearchDialog
              lenses={allLenses}
              onSelectLens={onSelectLens}
              getResultState={getResultState}
              triggerVariant="button"
              triggerLabel={t("addLens")}
              triggerClassName={`${ADD_LENS_BTN_BASE} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900`}
            />
          ) : (
            <button
              onClick={() => toast(t("compareFullHint"))}
              className={`${ADD_LENS_BTN_BASE} border-zinc-200 bg-white text-zinc-400 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600`}
            >
              {t("addLens")}
            </button>
          ))}
        {activeLenses.length > 0 && (
          <button
            onClick={clearCompareWithUndo}
            className={`shrink-0 text-sm font-medium px-3 py-2 rounded-xl ${TEXT_LINK_CLS}`}
          >
            {tList("clearCompare")}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {activeLenses.length >= 1 && (
            <ShareButton lenses={activeLenses} presetTitle={presetTitle} presetSubtitle={presetSubtitle} triggerClassName={UTILITY_BTN_CLS} />
          )}
          <FeedbackTrigger
            type="general"
            className={UTILITY_BTN_CLS}
          >
            <Flag className="size-4" />
            <span className="hidden sm:inline">{t("reportIssue")}</span>
          </FeedbackTrigger>
        </div>
      </div>

      <ShareFAB
        lenses={activeLenses}
        presetTitle={presetTitle}
        presetSubtitle={presetSubtitle}
      />
    </>
  );
}
