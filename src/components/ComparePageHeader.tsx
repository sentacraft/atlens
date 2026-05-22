"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ShareButton } from "@/components/share/ShareButton";
import ShareFAB from "@/components/ShareFAB";
import CompareLensPicker from "@/components/CompareLensPicker";
import { useCompare } from "@/context/CompareProvider";
import { useClearCompareWithUndo } from "@/hooks/useClearCompareWithUndo";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { getLensesByMount } from "@/lib/lens";
import { findPresetByIds } from "@/lib/curated-presets";
import type { Lens } from "@/lib/types";
import { TEXT_LINK_CLS } from "@/lib/ui-tokens";

interface Props {
  /** Matches CompareTable minColumns — button is hidden while empty slot columns are visible. */
  minColumns?: number;
}

export default function ComparePageHeader({ minColumns = 0 }: Props) {
  const t = useTranslations("Compare");
  const tList = useTranslations("LensList");
  const { compareIds } = useCompare();
  const clearCompareWithUndo = useClearCompareWithUndo();
  const mount = useEffectiveMount();
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";

  // Resolve full Lens objects from context IDs.
  // CompareTable seeds context via useLayoutEffect (before paint), so
  // compareIds is already populated by the time the user sees anything.
  const activeLenses = useMemo(
    () =>
      compareIds
        .map((id) => getLensesByMount(mount, locale).find((l) => l.id === id))
        .filter((l): l is Lens => l !== undefined),
    [compareIds, mount, locale],
  );

  // Reverse-derive the matching curated preset (if any) from the current
  // compare state. `?ids=` is the URL's single source of truth, so a preset
  // is "active" iff its lensIds exactly equal the live compareIds —
  // regardless of how the user got here (curated link, deep link, or
  // assembling by hand on the compare page itself).
  const matchedPreset = useMemo(() => findPresetByIds(compareIds), [compareIds]);
  const presetTitle = matchedPreset?.title[lang];
  const presetSubtitle = matchedPreset?.subtitle[lang];

  // On mobile cold-start the entire row is invisible (h1 is `sm:block`,
  // no buttons render until there's at least one lens), but the wrapper
  // still occupies a flex slot in the parent column — its zero height
  // plus the parent's `gap-3` doubles to ~24px of empty space between
  // the breadcrumb and the table. Collapse the wrapper to `display:none`
  // when there's nothing in it on mobile.
  const isEmpty = activeLenses.length === 0;

  return (
    <>
      <div className={`flex items-center gap-3 ${isEmpty ? "hidden sm:flex" : ""}`}>
        <h1 className="hidden sm:block text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
        {activeLenses.length >= minColumns && <CompareLensPicker />}
        {activeLenses.length > 0 && (
          <button
            onClick={clearCompareWithUndo}
            className={`shrink-0 text-sm font-medium px-3 py-2 rounded-xl ${TEXT_LINK_CLS}`}
          >
            {tList("clearCompare")}
          </button>
        )}
        {activeLenses.length >= 1 && (
          <div className="ml-auto">
            <ShareButton lenses={activeLenses} presetTitle={presetTitle} presetSubtitle={presetSubtitle} />
          </div>
        )}
      </div>

      <ShareFAB
        lenses={activeLenses}
        presetTitle={presetTitle}
        presetSubtitle={presetSubtitle}
      />
    </>
  );
}
