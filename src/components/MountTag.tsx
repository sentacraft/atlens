"use client";

import { useTranslations } from "next-intl";
import { useEffectiveMount } from "@/hooks/useMountParam";

// Small inline tag that reflects the current mount preference.
// Used in the hero section to provide visual feedback when the badge is toggled.
export default function MountTag() {
  const t = useTranslations("MountSwitcher");
  const mount = useEffectiveMount();
  const label = mount === "G" ? t("gfx") : t("x");

  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 transition-all">
      {label}
    </span>
  );
}
