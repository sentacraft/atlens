"use client";

import { Camera, Video, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { UsageFilter } from "@/lib/lens";

/**
 * Photo/Cine view-mode switch that rides the section-nav row, not the filter
 * panel. Photo and cine are two largely-separate product universes — a top
 * partition of the catalog, not a refinement — so this reads as a light text
 * toggle (icon + label, divided by a hairline), deliberately quieter than the
 * filter pills below. Both options carry their own icon at all times; the
 * active one is emphasized by colour rather than a heavy pill.
 */
const OPTIONS: {
  value: UsageFilter;
  labelKey: string;
  Icon: LucideIcon;
}[] = [
  { value: "photo", labelKey: "usagePhoto", Icon: Camera },
  { value: "cine", labelKey: "usageCine", Icon: Video },
];

export default function LensUsageSwitch({
  value,
  onChange,
}: {
  value: UsageFilter;
  onChange: (value: UsageFilter) => void;
}) {
  const t = useTranslations("LensList");
  return (
    <div
      role="radiogroup"
      aria-label={t("usage")}
      className="inline-flex items-center text-[12px]"
    >
      {OPTIONS.map((opt, index) => {
        const selected = value === opt.value;
        return (
          <div key={opt.value} className="flex items-center">
            {index > 0 && (
              <span
                aria-hidden="true"
                className="mx-2 h-3 w-px bg-zinc-200 dark:bg-zinc-700"
              />
            )}
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex items-center gap-1 font-medium transition-colors",
                selected
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300",
              )}
            >
              <opt.Icon className="size-3.5" aria-hidden="true" />
              {t(opt.labelKey)}
            </button>
          </div>
        );
      })}
    </div>
  );
}
