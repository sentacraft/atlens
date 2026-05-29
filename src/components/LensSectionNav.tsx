"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import { cn } from "@/lib/utils";

/**
 * Switcher between the two views of the lens library: the filterable list
 * ("所有镜头") and the curated collections ("合集"). Rendered as underline
 * tabs sitting on a full-width divider — a deliberately different component
 * type from the filter pills below, so page-level view switching reads as
 * navigation, not as another refinement control.
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
      className="flex w-full items-center gap-6 border-b border-zinc-200 dark:border-zinc-800"
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              // -mb-px pulls the 2px active indicator down to overlap the
              // nav's 1px bottom border, so the underline reads as the tab's
              // own indicator rather than a doubled rule.
              "relative -mb-px flex items-center border-b-2 pb-3 pt-0.5 text-[15px] font-semibold transition-colors",
              selected
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
