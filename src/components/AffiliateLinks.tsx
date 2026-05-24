"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Popover } from "@base-ui/react/popover";
import { ArrowUpRight, Info } from "lucide-react";
import { buildAffiliateLinks, readCountryCookie } from "@/lib/affiliate";
import type { Lens } from "@/lib/types";
import { track } from "@/lib/analytics";

interface Props {
  lens: Lens;
  customId?: string;
}

export function AffiliateLinks({ lens, customId }: Props) {
  const locale = useLocale();
  const t = useTranslations("Affiliate");

  const links = useMemo(() => {
    const country = readCountryCookie();
    return buildAffiliateLinks(lens, locale, country, customId);
  }, [lens, locale, customId]);

  if (links.length === 0) {
    return null;
  }

  return (
    <>
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => track("affiliate_click", {
            platform: link.platform,
            lens_id: lens.id,
            source: customId ?? "unknown",
          })}
          className="inline-flex min-h-7 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          {t("findOn", { platform: link.label })}
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      ))}
      <AffiliateDisclosure />
    </>
  );
}

export function AffiliateLinksRow({ lens, customId }: Omit<Props, "compact">) {
  const locale = useLocale();

  const links = useMemo(() => {
    const country = readCountryCookie();
    return buildAffiliateLinks(lens, locale, country, customId);
  }, [lens, locale, customId]);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => track("affiliate_click", {
            platform: link.platform,
            lens_id: lens.id,
            source: customId ?? "unknown",
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

function AffiliateDisclosure() {
  const t = useTranslations("Affiliate");
  return (
    <Popover.Root>
      <Popover.Trigger
        className="inline-flex min-h-7 cursor-pointer items-center text-zinc-400 outline-none transition-colors hover:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-500 dark:hover:text-zinc-400"
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
