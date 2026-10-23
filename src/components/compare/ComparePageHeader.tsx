"use client";

import { useMemo } from "react";
import { localized } from "@/i18n/localized";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import LensSearchDialog from "@/components/browse/LensSearchDialog";
import { Flag, Search } from "lucide-react";
import { LensShareButton } from "@/components/share/LensShareButton";
import ShareFAB from "@/components/share/ShareFAB";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import AskIrisEntry from "@/components/iris/AskIrisEntry";
import { usePageQuestions } from "@/components/iris/usePageQuestions";
import { brandLabel, lensDisplayName } from "@/lib/lens/format";
import { UTILITY_BTN_CLS } from "@/config/ui-tokens";
import { useCompare } from "@/context/CompareProvider";
import { useClearCompareWithUndo } from "@/hooks/useClearCompareWithUndo";
import { useCompareLensSearch } from "@/hooks/useCompareLensSearch";
import { findPresetByIds } from "@/lib/curated-presets";
import type { Lens } from "@/lib/types";
import { SEARCH_TRIGGER_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";

const ADD_LENS_BTN_BASE =
  "h-9 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors";

export default function ComparePageHeader({ allLenses }: { allLenses: Lens[] }) {
  const t = useTranslations("Compare");
  const tList = useTranslations("LensList");
  const tIris = useTranslations("IrisEntry");
  const tBrand = useTranslations("Brands");
  const irisQuestions = usePageQuestions();
  const { compareIds } = useCompare();
  const search = useCompareLensSearch();
  const clearCompareWithUndo = useClearCompareWithUndo();
  const locale = useLocale();

  const activeLenses = compareIds
    .map((id) => allLenses.find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);

  const matchedPreset = useMemo(() => findPresetByIds(compareIds), [compareIds]);
  const presetTitle = matchedPreset ? localized(matchedPreset.title, locale) : undefined;
  const presetSubtitle = matchedPreset ? localized(matchedPreset.subtitle, locale) : undefined;

  const isEmpty = activeLenses.length === 0;

  return (
    <>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${isEmpty ? "hidden sm:flex" : ""}`}>
        <h1 className="hidden sm:block text-2xl font-bold text-zinc-900">
          {t("title")}
        </h1>
        {activeLenses.length >= 1 &&
          (search.canAddMore ? (
            <>
              <button
                type="button"
                onClick={search.openSearch}
                className={cn(
                  SEARCH_TRIGGER_CLS,
                  ADD_LENS_BTN_BASE,
                  "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100",
                )}
              >
                <Search className="h-4 w-4" />
                {t("addLens")}
              </button>
              <LensSearchDialog {...search.dialogProps} lenses={allLenses} />
            </>
          ) : (
            <button
              onClick={() => toast(t("compareFullHint"))}
              className={`${ADD_LENS_BTN_BASE} border-zinc-200 bg-white text-zinc-400 cursor-not-allowed`}
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
          {activeLenses.length >= 2 && (
            <AskIrisEntry
              id="compare"
              label={tIris("compareLabel")}
              question={
                irisQuestions.compare(
                  activeLenses.map((lens) => lensDisplayName(brandLabel(tBrand, lens.brand), lens.series, lens.model)),
                )[0]
              }
              className="mr-1 h-9 max-sm:px-3"
            />
          )}
          {activeLenses.length >= 1 && (
            <LensShareButton lenses={activeLenses} presetTitle={presetTitle} presetSubtitle={presetSubtitle} trigger="utility" />
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
