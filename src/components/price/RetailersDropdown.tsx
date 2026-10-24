"use client";

import { useLocale, useTranslations } from "next-intl";
import { Popover } from "@base-ui/react/popover";
import { ArrowUpRight, ChevronDown, Info, ShoppingBag } from "lucide-react";
import { buildPurchaseLinks, purchaseDisclosureKey, shouldShowDisclosure } from "@/lib/purchase/links";
import type { PurchaseLink } from "@/lib/purchase/links";
import type { Lens } from "@/lib/types";
import { MENU_POPUP_CLS, PANEL_ACTION_CLS } from "@/config/ui-tokens";
import { track } from "@/lib/analytics/analytics";
import { useCountryCode } from "@/hooks/useCountryCode";
import { useIsMobileDevice } from "@/hooks/useViewport";
import { cn } from "@/lib/utils";

interface Props {
  lens: Lens;
  customId?: string;
}

export function RetailersDropdown({ lens, customId }: Props) {
  const locale = useLocale();
  const t = useTranslations("Purchase");
  const countryCode = useCountryCode();
  const isMobileDevice = useIsMobileDevice();

  const links = buildPurchaseLinks(lens, locale, countryCode, customId, isMobileDevice);

  if (links.length === 0) {
    return null;
  }

  const preview = links[0].label;
  const extra = links.length > 1 ? ` +${links.length - 1}` : "";
  const hasAffiliate = links.some((l) => l.isAffiliate);
  const showDisclosure = shouldShowDisclosure(links.length > 0, hasAffiliate, locale);

  return (
    <Popover.Root>
      <Popover.Trigger
        data-testid="lens-detail-price-trigger"
        className={cn(PANEL_ACTION_CLS, "cursor-pointer")}
      >
        <ShoppingBag className="size-4" aria-hidden="true" />
        <span className="inline-flex items-baseline gap-1.5">
          {t("buyAt")}
          {/* The lens page's actions are its @container, and this button takes half their width:
              below 440px that half no longer fits "Amazon +2", the widest hint. */}
          <span data-redact-hook="priceSource" className="hidden text-xs text-zinc-400 @min-[440px]:inline">
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
              <p className="border-t border-zinc-100 px-3 py-2 text-[10px] leading-relaxed text-zinc-500">
                <Info size={11} className="inline -mt-px mr-1 text-zinc-400" aria-hidden="true" />
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
      className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
    >
      <span data-redact-hook="priceSource">{link.label}</span>
      <ArrowUpRight size={12} className="text-zinc-400" />
    </a>
  );
}
