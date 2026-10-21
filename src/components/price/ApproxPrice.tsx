"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickPriceEntry, formatPrice } from "@/lib/lens/pricing";
import type { Lens } from "@/lib/types";

export default function ApproxPrice({ pricing }: { pricing: Lens["pricing"] }) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const selection = pickPriceEntry(pricing, locale);

  if (!selection) {
    return (
      <p className="text-sm font-semibold text-zinc-400">
        {t("priceUnavailable")}
      </p>
    );
  }

  const { entry, condition } = selection;
  const priceDisplay = formatPrice(t, entry.price, entry.currency);

  return (
    <p className="flex items-center gap-1 text-sm">
      <span data-redact-hook="price" className="font-semibold whitespace-nowrap tabular-nums text-zinc-700">
        {t.rich("priceApprox", {
          price: priceDisplay,
          approx: (chunks) => (
            <span className="font-normal text-zinc-400">
              {chunks}
            </span>
          ),
        })}
      </span>
      {condition === "used" && (
        <span className="shrink-0 rounded bg-zinc-100 px-1 py-px text-[9px] font-medium leading-tight text-zinc-500">
          {t("usedBadge")}
        </span>
      )}
    </p>
  );
}
