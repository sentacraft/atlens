"use client";

// Expanded price display for the lens detail page.
//
// Layout:
//   ┌─────────────────────────────────────────┐  ← island (light bg + border)
//   │  ¥1,299  [二手]  官方店（京东）· 采样于…   │
//   │  ⚠ 价格仅供参考 ▾  (collapsible note)    │
//   └─────────────────────────────────────────┘
//
// The tier/range (¥¥¥ 500–1,499) is intentionally omitted — on the detail
// page the exact price is visible, so the range adds no information.
//
// All strings are reused from the existing Pricing i18n namespace.

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
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
  const [noteOpen, setNoteOpen] = useState(false);

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
    <div className="flex flex-col gap-2.5">
      {/* Price + used badge + source · sampled date — all one tight group */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {priceDisplay}
        </span>
        {isUsed && (
          <span className="inline-flex items-center rounded bg-zinc-200/70 px-1.5 py-px text-[11px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
            {t("conditionUsed")}
          </span>
        )}
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {sourceDisplay}
          <span className="mx-1.5 opacity-40">·</span>
          {t("sampledAt", { date: sampledDisplay })}
        </span>
      </div>

      {/* Collapsible disclaimer */}
      <div>
        <button
          onClick={() => setNoteOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
        >
          <AlertTriangle className="size-3 shrink-0 text-amber-500" />
          <span>{t("disclaimerTrigger")}</span>
          {noteOpen
            ? <ChevronUp className="size-3 shrink-0" />
            : <ChevronDown className="size-3 shrink-0" />
          }
        </button>
        {noteOpen && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            {isUsed ? t("usedNote") : t("newNote")}
          </p>
        )}
      </div>
    </div>
  );
}
