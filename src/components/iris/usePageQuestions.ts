"use client";

import { useLocale, useTranslations } from "next-intl";
import { describeFilters } from "@/lib/askiris/page-ref";
import { brandLabel } from "@/lib/lens/format";
import type { FilterState } from "@/lib/lens/lens";

/**
 * Questions about what a page shows. Iris does not see the page, so each one names the lenses or
 * spells out the filters in full.
 */
export function usePageQuestions() {
  const t = useTranslations("IrisEntry");
  const locale = useLocale();
  const tBrand = useTranslations("Brands");
  const tList = useTranslations("LensList");
  const tBadge = useTranslations("SpecialtyBadge");
  const names = (list: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(list);
  const filters = (state: FilterState) =>
    describeFilters(state, { brand: (slug) => brandLabel(tBrand, slug), list: tList, badge: tBadge }).join(" · ");

  return {
    lens: (name: string) => [t("lensUse", { name }), t("lensTradeoffs", { name })],
    compare: (lensNames: string[]) => [
      t("compareQuestion", { names: names(lensNames) }),
      t("compareDaily", { names: names(lensNames) }),
    ],
    /** Empty when no filter is set: there is nothing on the page to ask about. */
    browse: (state: FilterState) => {
      const described = filters(state);
      return described ? t("browseQuestion", { filters: described }) : null;
    },
    noMatch: (state: FilterState) => t("emptyQuestion", { filters: filters(state) }),
  };
}
