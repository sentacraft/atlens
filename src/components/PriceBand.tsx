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
  formatSource,
  type PriceSelection,
} from "@/lib/lens-pricing";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

function PriceInfoPopover({
  selection,
  locale,
}: {
  selection: PriceSelection;
  locale: string;
}) {
  const t = useTranslations("Pricing");
  const { entry, condition } = selection;
  const tier = priceTier(entry.price, entry.currency);
  const isUsed = condition === "used";
  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition);
  const rangeDisplay = formatTierRange(tier, entry.currency, locale);
  const sourceDisplay = formatSource(entry.source, locale);
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
          <Popover.Popup className="max-w-56 origin-(--transform-origin) rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-zinc-700 shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <div className="flex flex-col gap-1.5">
              <p className={cn("text-sm font-semibold tabular-nums", isUsed && "text-zinc-500 dark:text-zinc-400")}>
                {priceDisplay}
                {isUsed && (
                  <span className="ml-1.5 text-[10px] font-normal">
                    {t("usedBadge")}
                  </span>
                )}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">
                {t("tierLabel", { tier, range: rangeDisplay })}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">
                {sourceDisplay} · {t("sampledAt", { date: sampledDisplay })}
              </p>
              {isUsed && (
                <p className="text-zinc-400 dark:text-zinc-500">{t("usedNote")}</p>
              )}
              <p className="text-zinc-400 dark:text-zinc-500">{t("disclaimerInline")}</p>
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

  if (!selection) {return null;}

  const { entry, condition } = selection;
  const tier = priceTier(entry.price, entry.currency);
  const isUsed = condition === "used";

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {/* 5-segment band */}
        <div className="flex items-center gap-0.5 w-[72px]">
          {([1, 2, 3, 4, 5] as const).map((i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-[2px]",
                compact ? "h-1.5" : "h-2",
                i <= tier
                  ? isUsed
                    ? "border border-dashed border-zinc-400 bg-zinc-300 dark:border-zinc-500 dark:bg-zinc-600/60"
                    : "bg-zinc-600 dark:bg-zinc-400"
                  : "bg-zinc-200 dark:bg-zinc-700/50"
              )}
            />
          ))}
        </div>

        {/* Used badge */}
        {isUsed && (
          <span className="shrink-0 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            {t("usedBadge")}
          </span>
        )}

        {/* Info popover */}
        <PriceInfoPopover selection={selection} locale={locale} />
      </div>

      {/* Price range — detail page only */}
      {!compact && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          {formatTierRange(tier, entry.currency, locale)}
        </p>
      )}
    </div>
  );
}
