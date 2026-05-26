"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const sep = <ChevronRight className="size-3 text-zinc-300 dark:text-zinc-600" />;
const linkCls =
  "text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50";

export default function CollectionBreadcrumb({ title }: { title?: string }) {
  const tn = useTranslations("Nav");
  const tc = useTranslations("Collection");

  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1.5 text-xs"
    >
      <Link href="/lenses/x" className={linkCls}>
        {tn("lenses")}
      </Link>
      {sep}
      {title ? (
        <>
          <Link href="/lenses/x/collections" className={linkCls}>
            {tc("breadcrumbCollections")}
          </Link>
          {sep}
          <span className="text-zinc-900 dark:text-zinc-100">{title}</span>
        </>
      ) : (
        <span className="text-zinc-900 dark:text-zinc-100">
          {tc("breadcrumbCollections")}
        </span>
      )}
    </nav>
  );
}
