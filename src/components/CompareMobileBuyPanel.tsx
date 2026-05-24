"use client";

import { useTranslations, useLocale } from "next-intl";
import { PurchaseLinksCompact, PurchaseDisclosureCaption } from "@/components/PurchaseLinks";
import { PriceCell } from "@/components/PriceCell";
import { pickPriceEntry } from "@/lib/lens-pricing";
import { lensSubtitleLine } from "@/lib/lens.format";
import { buildPurchaseLinks } from "@/lib/purchase-links";
import type { Lens } from "@/lib/types";

interface Props {
  lenses: Lens[];
  countryCode: string;
}

export function CompareMobileBuyPanel({ lenses, countryCode }: Props) {
  const t = useTranslations("Purchase");
  const locale = useLocale();
  const tBrand = useTranslations("Brands");

  const lensesWithLinks = lenses.filter(
    (lens) => buildPurchaseLinks(lens, locale, countryCode, "compare-mobile").length > 0,
  );

  if (lensesWithLinks.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 mb-44 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:hidden dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800/60 dark:bg-zinc-900">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t("whereToBuy")}
        </span>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {lensesWithLinks.map((lens) => {
          const sel = pickPriceEntry(lens.pricing, locale);
          return (
            <li key={lens.id} className="flex flex-col gap-2 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                    {lensSubtitleLine(tBrand(lens.brand), lens.series)}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-zinc-900 dark:text-zinc-50">
                    {lens.model}
                  </span>
                </div>
                {sel && (
                  <div className="shrink-0">
                    <PriceCell lens={lens} compact />
                  </div>
                )}
              </div>
              <PurchaseLinksCompact lens={lens} countryCode={countryCode} customId="compare-mobile" />
            </li>
          );
        })}
      </ul>
      <PurchaseDisclosureCaption className="border-t border-zinc-100 dark:border-zinc-800/60" />
    </div>
  );
}
