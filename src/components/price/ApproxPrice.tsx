"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickPriceEntry, formatPrice } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A lens's reference price as "~price", with "Used" beside it, or below it when the space is too narrow for both. */
export default function ApproxPrice({ pricing, className }: { pricing: Lens["pricing"]; className?: string }) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const selection = pickPriceEntry(pricing, locale);

  if (!selection) {
    return <p className={cn("text-sm font-semibold text-zinc-400", className)}>{t("priceUnavailable")}</p>;
  }

  const { entry, condition } = selection;
  return (
    <p className={cn("flex min-w-0 flex-wrap items-baseline gap-x-1 text-sm leading-tight", className)}>
      <span data-redact-hook="price" className="font-semibold whitespace-nowrap tabular-nums text-zinc-700">
        {t("priceAbout", { price: formatPrice(t, entry.price, entry.currency) })}
      </span>
      {condition === "used" && <span className="text-[10px] whitespace-nowrap text-zinc-500">{t("usedBadge")}</span>}
    </p>
  );
}
