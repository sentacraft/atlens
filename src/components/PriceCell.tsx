"use client";

// Per-lens price cell used in the compare table.
//
// Shows the captured price with an "approx." qualifier,
// and persistent source · sampled-date caption below.

import { Calendar } from "lucide-react";
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
  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition, t.raw("cnyAmount"));
  const sampledDisplay = formatSampledAt(entry.sampledAt, locale);

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span
        data-redact-hook="price"
        className={cn(
          "font-semibold tabular-nums text-zinc-700 dark:text-zinc-200",
          compact ? "text-sm" : "text-base",
        )}
      >
        {t.rich("priceApprox", {
          price: priceDisplay,
          approx: (chunks) => (
            <span className={cn("font-normal text-zinc-400 dark:text-zinc-500", compact ? "text-[10px]" : "text-xs")}>
              {chunks}
            </span>
          ),
        })}
      </span>

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
