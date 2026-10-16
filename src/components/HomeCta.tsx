"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { buildComparePath } from "@/lib/url/compare";
import { browsePath } from "@/lib/url/routes";

export default function HomeCta() {
  const h = useTranslations("Home");
  const mount = useEffectiveMount();

  return (
    <>
      <Link
        href={browsePath(mount)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity"
      >
        {h("cta")} →
      </Link>
      <Link
        href={buildComparePath(mount, [])}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        {h("ctaCompare")}
      </Link>
    </>
  );
}
