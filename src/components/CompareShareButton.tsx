"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { ShareButton } from "@/components/share/ShareButton";
import { useCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { getLensesByMount } from "@/lib/lens";
import { findPresetByIds } from "@/lib/curated-presets";
import type { Lens } from "@/lib/types";
import { UTILITY_BTN_CLS } from "@/lib/ui-tokens";

export default function CompareShareButton() {
  const { compareIds } = useCompare();
  const mount = useEffectiveMount();
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";

  const activeLenses = useMemo(
    () =>
      compareIds
        .map((id) => getLensesByMount(mount, locale).find((l) => l.id === id))
        .filter((l): l is Lens => l !== undefined),
    [compareIds, mount, locale],
  );

  const matchedPreset = useMemo(() => findPresetByIds(compareIds), [compareIds]);

  if (activeLenses.length === 0) {
    return null;
  }

  return (
    <ShareButton
      lenses={activeLenses}
      presetTitle={matchedPreset?.title[lang]}
      presetSubtitle={matchedPreset?.subtitle[lang]}
      triggerClassName={UTILITY_BTN_CLS}
    />
  );
}
