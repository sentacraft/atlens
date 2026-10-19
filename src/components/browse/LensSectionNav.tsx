"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountHasCollections } from "@/lib/mount";
import { cn } from "@/lib/utils";
import { browsePath, collectionsPath } from "@/lib/url/routes";

export default function LensSectionNav({ rightSlot }: { rightSlot?: ReactNode }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const mount = useEffectiveMount();
  const active = pathname.includes("/collections") ? "collections" : "browse";

  const tabs = [
    { key: "browse", label: t("allLenses"), href: browsePath(mount) },
    ...(mountHasCollections(mount)
      ? [{ key: "collections", label: t("collections"), href: collectionsPath(mount) }]
      : []),
  ];

  return (
    <nav
      aria-label={t("lenses")}
      className="flex w-full items-center border-b border-zinc-200"
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
                "relative -mb-px flex items-center border-b-2 pb-3 pt-0.5 text-[15px] font-semibold transition-colors",
                selected
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-700",
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
