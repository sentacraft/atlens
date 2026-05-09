"use client";

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { priceTier } from "@/lib/lens";
import {
  pickPriceEntry,
  formatPrice,
  formatTierRange,
  formatSampledAt,
  type PriceSelection,
} from "@/lib/lens-pricing";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

function PriceInfoPopover({
  selection,
  locale,
  tier,
}: {
  selection: PriceSelection;
  locale: string;
  tier: 1 | 2 | 3 | 4 | 5;
}) {
  const t = useTranslations("Pricing");
  const { entry, condition } = selection;
  const isUsed = condition === "used";
  const symbol = t("tierSymbol");
  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition, t);
  const rangeDisplay = formatTierRange(tier, entry.currency, locale);
  const sourceDisplay = entry.source;
  const sampledDisplay = formatSampledAt(entry.sampledAt, locale);

  return (
    <Popover.Root>
      <Popover.Trigger
        className="inline-flex shrink-0 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-500 dark:hover:text-zinc-300"
        aria-label={t("infoTriggerLabel")}
      >
        <Info className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={6}>
          <Popover.Popup className="max-w-72 origin-(--transform-origin) rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-zinc-700 shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <div className="flex flex-col gap-1.5">
              {/* Price + used badge + source on one line */}
              <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {priceDisplay}
                {isUsed && (
                  <span className="inline-flex items-center rounded bg-zinc-100 px-1 py-px text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {t("usedBadge")}
                  </span>
                )}
                <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                  · {sourceDisplay}
                </span>
              </p>
              {/* Sampled date — directly annotates the price above */}
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {t("sampledAt", { date: sampledDisplay })}
              </p>
              {/* Condition-specific disclaimer */}
              <p className="text-zinc-400 dark:text-zinc-500">
                {isUsed ? t("usedNote") : t("newNote")}
              </p>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

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
  // priceTier returns undefined for unknown currency (defensive switch/case in
  // lens.ts). The schema constrains currency to "CNY" | "USD" so this is
  // unreachable at runtime, but the narrowing is needed for type safety.
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
        <PriceInfoPopover selection={selection} locale={locale} tier={tier} />
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
