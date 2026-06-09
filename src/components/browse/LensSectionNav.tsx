"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment, mountHasCollections } from "@/lib/mount";
import { cn } from "@/lib/utils";

/**
 * Switcher between the two views of the lens library: the filterable list
 * ("所有镜头") and the curated collections ("合集"). Rendered as underline
 * tabs sitting on a full-width divider — a deliberately different component
 * type from the filter pills below, so page-level view switching reads as
 * navigation, not as another refinement control.
 *
 * `rightSlot` rides the right edge of the same divider for view-mode controls
 * that belong at the navigation tier rather than among the filters (e.g. the
 * photo/cine switch). It shares the tab row's baseline but stays visually
 * distinct from the refinement pills below.
 */
export default function LensSectionNav({ rightSlot }: { rightSlot?: ReactNode }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const mount = useEffectiveMount();
  const seg = mountToUrlSegment(mount);
  const active = pathname.includes("/collections") ? "collections" : "browse";

  // Collections is an X-only view for now; mounts without it (GFX) show just
  // the lens list and never surface a tab that would dead-end. mountHasCollections
  // is the single switch that re-enables this when GFX collections ship.
  const tabs = [
    { key: "browse", label: t("allLenses"), href: `/lenses/${seg}/browse` },
    ...(mountHasCollections(mount)
      ? [{ key: "collections", label: t("collections"), href: `/lenses/${seg}/collections` }]
      : []),
  ];

  return (
    <nav
      aria-label={t("lenses")}
      className="flex w-full items-center border-b border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-center gap-6">
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
      </div>
      {rightSlot ? <div className="ml-auto pb-2 pl-4">{rightSlot}</div> : null}
    </nav>
  );
}
