"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ShareButton } from "@/components/share/ShareButton";
import ShareFAB from "@/components/ShareFAB";
import CompareAddLensButton from "@/components/CompareAddLensButton";
import { useMountedCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import { getLensesByMount } from "@/lib/lens";
import { useRouter } from "@/i18n/navigation";
import type { Lens } from "@/lib/types";
import { TEXT_LINK_CLS } from "@/lib/ui-tokens";

interface Props {
  /** Matches CompareTable minColumns — button is hidden while empty slot columns are visible. */
  minColumns?: number;
  /** Preset title to pre-fill the poster title field. */
  presetTitle?: string;
  /** Preset subtitle to pre-fill the poster slogan field. */
  presetSubtitle?: string;
  /** Original lens IDs of the preset — used to detect when the user has modified the comparison. */
  presetLensIds?: string[];
}

export default function ComparePageHeader({ minColumns = 0, presetTitle, presetSubtitle, presetLensIds }: Props) {
  const t = useTranslations("Compare");
  const tList = useTranslations("LensList");
  const { compareIds, clearCompare } = useMountedCompare();
  const mount = useEffectiveMount();
  const locale = useLocale();
  const router = useRouter();

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

  // Only forward preset title/subtitle when the current comparison still
  // matches the original preset (same set of lens IDs, order-insensitive).
  const presetStillMatches = useMemo(() => {
    if (!presetLensIds || presetLensIds.length === 0) {
      return false;
    }
    if (compareIds.length !== presetLensIds.length) {
      return false;
    }
    const currentSet = new Set(compareIds);
    return presetLensIds.every((id) => currentSet.has(id));
  }, [compareIds, presetLensIds]);

  const effectivePresetTitle = presetStillMatches ? presetTitle : undefined;
  const effectivePresetSubtitle = presetStillMatches ? presetSubtitle : undefined;

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="hidden sm:block text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
        {activeLenses.length >= minColumns && <CompareAddLensButton />}
        {activeLenses.length > 0 && (
          <button
            onClick={() => { clearCompare(); router.replace(`/lenses/${mountToUrlSegment(mount)}/compare`); }}
            className={`shrink-0 text-sm font-medium px-3 py-2 rounded-xl ${TEXT_LINK_CLS}`}
          >
            {tList("clearCompare")}
          </button>
        )}
        {activeLenses.length >= 1 && (
          <div className="ml-auto">
            <ShareButton lenses={activeLenses} presetTitle={effectivePresetTitle} presetSubtitle={effectivePresetSubtitle} />
          </div>
        )}
      </div>

      <ShareFAB
        lenses={activeLenses}
        presetTitle={effectivePresetTitle}
        presetSubtitle={effectivePresetSubtitle}
      />
    </>
  );
}
