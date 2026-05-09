"use client";

import { useTranslations, useLocale } from "next-intl";
import { priceTier } from "@/lib/lens";
import {
  pickPriceEntry,
  formatTierRange,
} from "@/lib/lens-pricing";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  lens: Lens;
  compact?: boolean;
}

export function PriceBand({ lens, compact = false }: Props) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const selection = pickPriceEntry(lens.pricing, locale);

  if (!selection) {
    return null;
  }

  const { entry, condition } = selection;
  const tier = priceTier(entry.price, entry.currency);
  if (tier === undefined) {
    return null;
  }
  const isUsed = condition === "used";
  const symbol = t("tierSymbol");
  const rangeDisplay = formatTierRange(tier, entry.currency, locale);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            "font-semibold tabular-nums tracking-wide",
            compact ? "text-sm" : "text-base",
            "text-zinc-700 dark:text-zinc-200"
          )}
          aria-hidden="true"
        >
          {symbol.repeat(tier)}
        </span>
        {isUsed && (
          <span className="inline-flex shrink-0 items-center rounded bg-zinc-100 px-1 py-px text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {t("usedBadge")}
          </span>
        )}
      </div>
      {/* Range subtext — matches the subValue pattern used elsewhere in CompareTable */}
      <p className="tabular-nums text-[11px] text-zinc-400 dark:text-zinc-500">
        {entry.currency === "CNY"
          ? t("cnyAmount", { value: rangeDisplay })
          : `$${rangeDisplay}`}
      </p>
    </div>
  );
}
