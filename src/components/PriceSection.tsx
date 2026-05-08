"use client";

// Expanded price display for the lens detail page.
//
// Unlike PriceBand (which compresses everything into ¥¥¥ + a popover for use
// in the compare table), PriceSection surfaces the full price context inline:
//
//   ¥3,299   官方店（京东）  ·  采样于 2026年5月8日
//   ¥¥¥  1,500–4,999
//   价格仅供参考。电商平台标价变动频繁……
//
// All strings are reused from the existing Pricing i18n namespace — no new
// copy needed.

import { useTranslations, useLocale } from "next-intl";
import { priceTier } from "@/lib/lens";
import {
  pickPriceEntry,
  formatPrice,
  formatTierRange,
  formatSampledAt,
  formatSource,
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
  const symbol = t("tierSymbol");

  const priceDisplay = formatPrice(entry.price, entry.currency, locale, condition, t);
  const rangeDisplay = formatTierRange(tier, entry.currency, locale);
  const sourceDisplay = formatSource(entry.source, t);
  const sampledDisplay = formatSampledAt(entry.sampledAt, locale);

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: actual price + used badge + source · sampled date */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {priceDisplay}
        </span>
        {isUsed && (
          <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-px text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {t("conditionUsed")}
          </span>
        )}
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {sourceDisplay}
          <span className="mx-1 opacity-50">·</span>
          {t("sampledAt", { date: sampledDisplay })}
        </span>
      </div>

      {/* Row 2: tier symbols + numeric range */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-semibold tracking-wide">{symbol.repeat(tier)}</span>
        {"  "}
        <span className="tabular-nums">{rangeDisplay}</span>
      </p>

      {/* Row 3: inline note — no popover needed on the detail page */}
      <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
        {isUsed ? t("usedNote") : t("newNote")}
      </p>
    </div>
  );
}
