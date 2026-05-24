"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Popover } from "@base-ui/react/popover";
import { ArrowUpRight, Info } from "lucide-react";
import { buildPurchaseLinks } from "@/lib/purchase-links";
import type { Lens } from "@/lib/types";
import { track } from "@/lib/analytics";

interface Props {
  lens: Lens;
  countryCode: string;
  customId?: string;
}

export function PurchaseLinksSection({ lens, countryCode, customId }: Props) {
  const locale = useLocale();
  const t = useTranslations("Purchase");

  const links = useMemo(
    () => buildPurchaseLinks(lens, locale, countryCode, customId),
    [lens, locale, countryCode, customId],
  );

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
          {t("whereToBuy")}
        </span>
        <PurchaseDisclosure />
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.channel}
            href={link.url}
            target="_blank"
            rel={`noopener noreferrer${link.isAffiliate ? " sponsored" : ""}`}
            onClick={() => track("purchase_click", {
              channel: link.channel,
              lens_id: lens.id,
              source: customId ?? "unknown",
              is_affiliate: link.isAffiliate,
            })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {link.label}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}

export function PurchaseLinksCompact({ lens, countryCode, customId }: Props) {
  const locale = useLocale();

  const links = useMemo(
    () => buildPurchaseLinks(lens, locale, countryCode, customId),
    [lens, locale, countryCode, customId],
  );

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {links.map((link) => (
        <a
          key={link.channel}
          href={link.url}
          target="_blank"
          rel={`noopener noreferrer${link.isAffiliate ? " sponsored" : ""}`}
          onClick={() => track("purchase_click", {
            channel: link.channel,
            lens_id: lens.id,
            source: customId ?? "unknown",
            is_affiliate: link.isAffiliate,
          })}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          {link.label}
          <ArrowUpRight className="size-2.5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function PurchaseDisclosure() {
  const t = useTranslations("Purchase");
  return (
    <Popover.Root>
      <Popover.Trigger
        className="inline-flex cursor-pointer items-center text-zinc-400 outline-none transition-colors hover:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-500 dark:hover:text-zinc-400"
        aria-label={t("disclosure")}
      >
        <Info className="size-3.5" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={6}>
          <Popover.Popup className="max-w-72 origin-(--transform-origin) rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-700 shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {t("disclosureDetail")}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
