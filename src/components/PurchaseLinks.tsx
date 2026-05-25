"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Info } from "lucide-react";
import { buildPurchaseLinks } from "@/lib/purchase-links";
import type { PurchaseLink } from "@/lib/purchase-links";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { useCountryCode } from "@/hooks/useCountryCode";

interface Props {
  lens: Lens;
  customId?: string;
  className?: string;
}

const LINK_CLS = "inline-flex whitespace-nowrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

function PurchaseLinkList({ links, lensId, customId, className }: { links: PurchaseLink[]; lensId: string; customId?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {links.map((link) => (
        <a
          key={link.channel}
          href={link.url}
          target="_blank"
          rel={`noopener noreferrer${link.isAffiliate ? " sponsored" : ""}`}
          onClick={() => track("purchase_click", {
            channel: link.channel,
            lens_id: lensId,
            source: customId ?? "unknown",
            is_affiliate: link.isAffiliate,
          })}
          className={LINK_CLS}
        >
          {link.label}
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}


export function PurchaseLinksCompact({ lens, customId, className }: Props) {
  const locale = useLocale();
  const countryCode = useCountryCode();

  const links = useMemo(
    () => buildPurchaseLinks(lens, locale, countryCode, customId),
    [lens, locale, countryCode, customId],
  );

  if (links.length === 0) {
    return null;
  }

  return <PurchaseLinkList links={links} lensId={lens.id} customId={customId} className={className} />;
}

export function PurchaseDisclosureCaption({ className }: { className?: string }) {
  const t = useTranslations("Purchase");
  return (
    <p
      className={cn(
        "px-3 py-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400",
        className,
      )}
    >
      <Info className="inline size-3 -mt-px mr-1 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
      {t("disclosureDetail")}
    </p>
  );
}
