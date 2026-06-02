"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Popover } from "@base-ui/react/popover";
import { ArrowUpRight, ChevronDown, Info } from "lucide-react";
import { buildPurchaseLinks, purchaseDisclosureKey, shouldShowDisclosure } from "@/lib/purchase-links";
import type { PurchaseLink } from "@/lib/purchase-links";
import type { Lens } from "@/lib/types";
import { ACTION_OUTLINE_CLS, MENU_POPUP_CLS } from "@/lib/ui-tokens";
import { track } from "@/lib/analytics";
import { useCountryCode } from "@/hooks/useCountryCode";
import { cn } from "@/lib/utils";

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

  // Single-channel preview keeps the trigger compact: "Check price" is the
  // primary label, the retailer name is just a secondary hint of what's behind
  // it. Remaining channels collapse into a "+N" count and show on open.
  const preview = links[0].label;
  const extra = links.length > 1 ? ` +${links.length - 1}` : "";
  const hasAffiliate = links.some((l) => l.isAffiliate);
  const showDisclosure = shouldShowDisclosure(links.length > 0, hasAffiliate, locale);

  return (
    <Popover.Root>
      <Popover.Trigger className={`${ACTION_OUTLINE_CLS} cursor-pointer`}>
        {/* Baseline-align the label and the smaller retailer hint so their text
            sits on one line; the chevron stays center-aligned via the trigger. */}
        <span className="inline-flex items-baseline gap-1.5">
          {t("buyAt")}
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {preview}{extra}
          </span>
        </span>
        <ChevronDown size={13} className="ml-0.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6}>
          <Popover.Popup className={cn(MENU_POPUP_CLS, "w-[var(--anchor-width)]")}>
            {links.map((link) => (
              <DropdownItem key={link.channel} link={link} lensId={lens.id} customId={customId} />
            ))}
            {showDisclosure && (
              <p className="mt-1 border-t border-zinc-100 px-3 py-2 text-[10px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <Info size={11} className="inline -mt-px mr-1 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
                {t(purchaseDisclosureKey(locale))}
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
