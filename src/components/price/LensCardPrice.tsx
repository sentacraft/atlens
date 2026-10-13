"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickPriceEntry, formatPrice } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";

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
  const priceDisplay = formatPrice(entry.price, entry.currency, locale, t.raw("cnyAmount"));

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
