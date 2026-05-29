"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import { cn } from "@/lib/utils";

/**
 * Switcher between the two views of the lens library: the filterable list
 * ("所有镜头") and the curated collections ("合集"). Mirrors the in-page
 * filter segmented controls so the whole header reads as one control family.
 */
export default function LensSectionNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const seg = mountToUrlSegment(useEffectiveMount());
  const active = pathname.includes("/collections") ? "collections" : "browse";

  const tabs = [
    { key: "browse", label: t("allLenses"), href: `/lenses/${seg}/browse` },
    { key: "collections", label: t("collections"), href: `/lenses/${seg}/collections` },
  ] as const;

  return (
    <nav
      aria-label={t("lenses")}
      className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              // Same segmented-control shape as the filter controls below, but
              // a notch larger/bolder with stronger active contrast — it's the
              // primary view switcher, not a secondary filter.
              "inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold transition-colors sm:h-8",
              selected
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50 dark:shadow-none"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
