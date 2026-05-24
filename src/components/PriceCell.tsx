"use client";

// Per-lens price cell used in the compare table.
//
// Shows the real captured price, optional Used badge (clickable — explains
// why a used reference was picked), and persistent source · sampled-date
// caption below. The unified disclaimer for the whole pricing column lives
// next to the "Price" field label on the left, not repeated per cell.

import { Popover } from "@base-ui/react/popover";
import { Calendar, Info } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  pickPriceEntry,
  formatPrice,
  formatSampledAt,
} from "@/lib/lens-pricing";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  lens: Lens;
  compact?: boolean;
}

export function PriceCell({ lens, compact = false }: Props) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const selection = pickPriceEntry(lens.pricing, locale);

  if (!selection) {
    return null;
  }

  const { entry, condition } = selection;
  const isUsed = condition === "used";
  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition, t.raw("cnyAmount"));
  const sampledDisplay = formatSampledAt(entry.sampledAt, locale);

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            "font-semibold tabular-nums text-zinc-700 dark:text-zinc-200",
            compact ? "text-sm" : "text-base",
          )}
        >
          {priceDisplay}
        </span>
        {compact && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {t("approx")}
          </span>
        )}
        {isUsed && (
          <Popover.Root>
            <Popover.Trigger
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded bg-zinc-100 px-1 py-px text-[10px] font-medium text-zinc-500 outline-none transition-colors hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <span>{t("usedBadge")}</span>
              <Info className="size-2.5 opacity-70" aria-hidden="true" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="top" align="center" sideOffset={6}>
                <Popover.Popup className="max-w-72 origin-(--transform-origin) rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {t("usedReason")}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {!compact && (
        <>
          <span
            data-redact-hook="priceSource"
            className="text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 break-words"
          >
            {entry.source}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] leading-tight text-zinc-400 dark:text-zinc-500 tabular-nums">
            <Calendar className="size-2.5" aria-hidden="true" />
            {sampledDisplay}
          </span>
        </>
      )}
    </div>
  );
}
