"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { meta, getLensesByMount } from "@/lib/lens";
import { useEffectiveMount } from "@/hooks/useMountParam";

type ClickState = "date" | "version" | "easter";

export default function DataInfo() {
  const h = useTranslations("Home");
  const t = useTranslations("Footer");
  const locale = useLocale();
  const mount = useEffectiveMount();
  const mountLenses = getLensesByMount(mount);
  const lensCount = mountLenses.length;
  const brandCount = new Set(mountLenses.map((l) => l.brand)).size;
  const [clickState, setClickState] = useState<ClickState>("date");

  const cycle = () =>
    setClickState((s) =>
      s === "date" ? "version" : s === "version" ? "easter" : "date"
    );

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(
      new Date(dateStr)
    );

  const dateLabel = (() => {
    if (clickState === "version")
      {return `${meta.version} Build ${meta.buildNumber}`;}
    if (clickState === "easter") {
      return h("dataSnapshot");
    }
    return `${t("updatedPrefix")} ${formatDate(meta.lastUpdated)}`;
  })();

  return (
    <div className="flex flex-col items-center gap-0.5 mt-3">
      <p
        className="text-[11px] tracking-wider text-zinc-400 dark:text-zinc-500 font-mono"
        title={h("dataTooltip")}
      >
        {h("dataSnapshotCount", { count: lensCount, brands: brandCount })}
      </p>
      <p
        className="text-[11px] tracking-wider text-zinc-400 dark:text-zinc-500 font-mono cursor-pointer hover:text-zinc-300 dark:hover:text-zinc-400 transition-colors"
        onClick={cycle}
      >
        {dateLabel}
      </p>
    </div>
  );
}
