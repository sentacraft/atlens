"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";

export default function HomeCta() {
  const h = useTranslations("Home");
  const mount = useEffectiveMount();
  const seg = mountToUrlSegment(mount);

  return (
    <Link
      href={`/lenses/${seg}`}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity"
    >
      {h("cta")} →
    </Link>
  );
}
