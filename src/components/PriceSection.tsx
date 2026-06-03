"use client";

// Expanded price display for the lens detail page.
//
// Layout:
//   ~¥1,299  (zh) / $999 approx.  (en)
//   source · Sampled date
//   ⚠ Disclaimer · …

import { Popover } from "@base-ui/react/popover";
import { Calendar, Info } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  pickPriceEntry,
  formatPrice,
  formatSampledAt,
} from "@/lib/lens-pricing";
import type { Lens } from "@/lib/types";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";

interface Props {
  lens: Lens;
}

export function PriceSection({ lens }: Props) {
  const t = useTranslations("Pricing");
  const locale = useLocale();

  const selection = pickPriceEntry(lens.pricing, locale);
  if (!selection) {
    return null;
  }

  const { entry, condition } = selection;
  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition, t.raw("cnyAmount"));
  const sourceDisplay = entry.source;
  const sampledDisplay = formatSampledAt(entry.sampledAt, locale);

  return (
    <div className="flex flex-col gap-1">
      {/* Row 1: Price + approx */}
      <span data-redact-hook="price" className="text-xl font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
        {t.rich("priceApprox", {
          price: priceDisplay,
          approx: (chunks) => (
            <span className="text-sm font-normal text-zinc-400 dark:text-zinc-500">{chunks}</span>
          ),
        })}
      </span>

      {/* Row 2: Source + sampled date */}
      <div className="inline-flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        <span data-redact-hook="priceSource">{sourceDisplay}</span>
        <span className="opacity-30">|</span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Calendar className="size-3" aria-hidden="true" />
          {sampledDisplay}
        </span>
      </div>

      {/* Row 3: Inline disclaimer */}
      <PriceDisclaimer className="mt-1 pt-2 border-t border-zinc-100 dark:border-zinc-800" />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UsedBadge({ size, reason, label }: { size: "sm" | "md"; reason: string; label: string }) {
  const padding = size === "md" ? "px-1.5 py-px" : "px-1 py-px";
  const fontSize = size === "md" ? "text-[11px]" : "text-[10px]";
  const iconSize = size === "md" ? "size-3" : "size-2.5";
  return (
    <Popover.Root>
      <Popover.Trigger
        className={`inline-flex cursor-pointer items-center gap-1 rounded ${padding} ${fontSize} font-medium text-zinc-500 outline-none transition-colors bg-zinc-200/70 hover:bg-zinc-300/70 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:focus-visible:ring-zinc-500`}
      >
        <span>{label}</span>
        <Info className={`${iconSize} opacity-70`} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={6}>
          <Popover.Popup className="max-w-72 origin-(--transform-origin) rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {reason}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
