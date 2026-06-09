"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickPriceEntry, formatPrice } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";

/**
 * Reference price on a lens card. Deliberately a plain labelled datum, not a
 * sortable/comparable number: the price is a volatile sampled reference, so we
 * show it for positioning and let the reader judge — the "~" approx qualifier
 * carries the disclaimer in condensed form (full disclaimer lives on detail).
 *
 * Market + new/used selection is delegated to pickPriceEntry (locale → cn/global,
 * new preferred, used fallback). Used-only lenses (mostly discontinued) keep a
 * "Used" tag so the number isn't mistaken for a new price. Missing → "Price N/A".
 */
export default function LensCardPrice({ lens }: { lens: Lens }) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const selection = pickPriceEntry(lens.pricing, locale);

  if (!selection) {
    return (
      <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
        {t("priceUnavailable")}
      </p>
    );
  }

  const { entry, condition } = selection;
  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition, t.raw("cnyAmount"));

  return (
    <p className="flex items-baseline gap-1 text-sm">
      <span data-redact-hook="price" className="font-semibold whitespace-nowrap tabular-nums text-zinc-700 dark:text-zinc-200">
        {t.rich("priceApprox", {
          price: priceDisplay,
          approx: (chunks) => (
            <span className="font-normal text-zinc-400 dark:text-zinc-500">
              {chunks}
            </span>
          ),
        })}
      </span>
      {condition === "used" && (
        <span className="shrink-0 rounded bg-zinc-100 px-1 py-px text-[9px] font-medium leading-tight text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {t("usedBadge")}
        </span>
      )}
    </p>
  );
}
