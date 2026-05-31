"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Popover } from "@base-ui/react/popover";
import { ArrowUpRight, ChevronDown, Info } from "lucide-react";
import { buildPurchaseLinks } from "@/lib/purchase-links";
import type { PurchaseLink } from "@/lib/purchase-links";
import type { Lens } from "@/lib/types";
import { ACTION_OUTLINE_CLS } from "@/lib/ui-tokens";
import { track } from "@/lib/analytics";
import { useCountryCode } from "@/hooks/useCountryCode";

interface Props {
  lens: Lens;
  customId?: string;
}

export function RetailersDropdown({ lens, customId }: Props) {
  const locale = useLocale();
  const t = useTranslations("Purchase");
  const countryCode = useCountryCode();

  const links = useMemo(
    () => buildPurchaseLinks(lens, locale, countryCode, customId),
    [lens, locale, countryCode, customId],
  );

  if (links.length === 0) {
    return null;
  }

  const preview = links
    .slice(0, 2)
    .map((l) => l.label)
    .join(", ");
  const extra = links.length > 2 ? ` +${links.length - 2}` : "";
  const hasAffiliate = links.some((l) => l.isAffiliate);

  return (
    <Popover.Root>
      <Popover.Trigger className={`${ACTION_OUTLINE_CLS} cursor-pointer`}>
        {t("buyAt")}
        <span className="text-zinc-400 dark:text-zinc-500">
          {preview}{extra}
        </span>
        <ChevronDown size={13} className="ml-0.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6}>
          <Popover.Popup className="w-[var(--anchor-width)] origin-(--transform-origin) overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900">
            {links.map((link) => (
              <DropdownItem key={link.channel} link={link} lensId={lens.id} customId={customId} />
            ))}
            {hasAffiliate && (
              <p className="mt-1 border-t border-zinc-100 px-3 py-2 text-[10px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <Info size={11} className="inline -mt-px mr-1 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
                {t("disclosureDetail")}
              </p>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DropdownItem({ link, lensId, customId }: { link: PurchaseLink; lensId: string; customId?: string }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel={`noopener noreferrer${link.isAffiliate ? " sponsored" : ""}`}
      onClick={() => track("purchase_click", {
        channel: link.channel,
        lens_id: lensId,
        source: customId ?? "unknown",
        is_affiliate: link.isAffiliate,
      })}
      className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span>{link.label}</span>
      <ArrowUpRight size={12} className="text-zinc-400" />
    </a>
  );
}
