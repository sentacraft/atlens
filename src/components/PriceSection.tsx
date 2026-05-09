"use client";

// Expanded price display for the lens detail page.
//
// Layout:
//   $139  [Used]
//   source · Sampled date · For reference only (i)
//
// The (i) icon opens a popover with the full disclaimer.
// The tier/range is intentionally omitted — on the detail page the exact
// price is visible, so the range adds no information.

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { priceTier } from "@/lib/lens";
import {
  pickPriceEntry,
  formatPrice,
  formatSampledAt,
} from "@/lib/lens-pricing";
import type { Lens } from "@/lib/types";

interface Props {
  lens: Lens;
}

export function PriceSection({ lens }: Props) {
  const t = useTranslations("Pricing");
  const locale = useLocale();

  const selection = pickPriceEntry(lens.pricing, locale);
  if (!selection) return null;

  const { entry, condition } = selection;
  const tier = priceTier(entry.price, entry.currency);
  if (tier === undefined) return null;

  const isUsed = condition === "used";

  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition, t);
  const sourceDisplay = entry.source;
  const sampledDisplay = formatSampledAt(entry.sampledAt, locale);

  return (
    <div className="flex flex-col gap-1">
      {/* Price + used badge */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {priceDisplay}
        </span>
        {isUsed && (
          <span className="inline-flex items-center rounded bg-zinc-200/70 px-1.5 py-px text-[11px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
            {t("conditionUsed")}
          </span>
        )}
      </div>

      {/* Source + sampled date + disclaimer popover */}
      <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>
          {sourceDisplay}
          <span className="mx-1 opacity-40">·</span>
          {t("sampledAt", { date: sampledDisplay })}
          <span className="mx-1 opacity-40">·</span>
          {t("disclaimerTrigger")}
        </span>
        <Popover.Root>
          <Popover.Trigger
            className="inline-flex shrink-0 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-500 dark:hover:text-zinc-300"
            aria-label={t("disclaimerTrigger")}
          >
            <Info className="size-3.5" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="top" align="center" sideOffset={6}>
              <Popover.Popup className="max-w-72 origin-(--transform-origin) rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {isUsed ? t("detailUsedNote") : t("detailNewNote")}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}
