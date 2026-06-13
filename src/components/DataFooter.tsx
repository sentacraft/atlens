"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";

type ClickState = "count" | "easter";

interface MountStats {
  lensCount: number;
  brandCount: number;
}

interface DataInfoProps {
  mountStats: { X: MountStats; G: MountStats };
}

export default function DataInfo({ mountStats }: DataInfoProps) {
  const h = useTranslations("Home");
  const t = useTranslations("Footer");
  const mount = useEffectiveMount();
  const { lensCount, brandCount } = mountStats[mount];
  const [clickState, setClickState] = useState<ClickState>("count");

  const toggle = () =>
    setClickState((s) => (s === "count" ? "easter" : "count"));

  return (
    <div className="flex flex-col items-center gap-0.5 mt-3">
      <p
        className="text-[11px] tracking-wider text-zinc-400 dark:text-zinc-500 font-mono cursor-pointer hover:text-zinc-300 dark:hover:text-zinc-400 transition-colors"
        title={h("dataTooltip")}
        onClick={toggle}
      >
        {clickState === "easter"
          ? h("dataSnapshot")
          : h("dataSnapshotCount", { count: lensCount, brands: brandCount })}
      </p>
      <Link
        href="/whats-new"
        className="inline-flex items-center gap-1 text-[11px] tracking-wider font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
      >
        <Sparkles className="size-3" />
        {t("whatsNew")}
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
