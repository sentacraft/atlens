"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { MountSegment } from "@/lib/mount";

interface Props {
  currentMount: MountSegment;
}

export default function MountSwitcher({ currentMount }: Props) {
  const t = useTranslations("MountSwitcher");
  const pathname = usePathname();

  // Swap mount segment in current path for the switcher link
  function getHrefForMount(target: MountSegment): string {
    // Replace /lenses/x or /lenses/gfx prefix with the target mount
    return pathname.replace(/^(\/lenses\/)(x|gfx)(\b|$)/, `$1${target}$3`) || `/lenses/${target}`;
  }

  const tabs: { segment: MountSegment; label: string }[] = [
    { segment: "x", label: t("x") },
    { segment: "gfx", label: t("gfx") },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 max-w-7xl mx-auto w-full">
      {tabs.map(({ segment, label }) => (
        <Link
          key={segment}
          href={getHrefForMount(segment)}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            currentMount === segment
              ? "border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
