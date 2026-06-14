"use client";

import { useTranslations, useLocale } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";

interface MountStats {
  lensCount: number;
  brandCount: number;
}

interface DataInfoProps {
  mountStats: { X: MountStats; G: MountStats };
  lastAddedAt: string | null;
}

export default function DataInfo({ mountStats, lastAddedAt }: DataInfoProps) {
  const h = useTranslations("Home");
  const t = useTranslations("Footer");
  const locale = useLocale();
  const mount = useEffectiveMount();
  const { lensCount, brandCount } = mountStats[mount];

  const addedLabel = lastAddedAt
    ? new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${lastAddedAt}T00:00:00Z`))
    : null;

  return (
    <div className="flex flex-col items-center gap-0.5 mt-3">
      <p
        className="text-[11px] tracking-wider text-zinc-400 dark:text-zinc-500 font-mono"
        title={h("dataTooltip")}
      >
        {h("dataSnapshotCount", { count: lensCount, brands: brandCount })}
      </p>
      <Link
        href="/whats-new"
        className="inline-flex items-center gap-1 text-[11px] tracking-wider font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        <Sparkles className="size-3" />
        <span>{t("whatsNew")}</span>
        {addedLabel ? (
          <span className="text-zinc-400 dark:text-zinc-500">· {addedLabel}</span>
        ) : null}
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
