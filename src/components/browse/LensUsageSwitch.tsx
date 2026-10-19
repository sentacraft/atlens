"use client";

import { Camera, Video, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { UsageFilter } from "@/lib/lens/lens";

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
                className="mx-2 h-3 w-px bg-zinc-200"
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
                  ? "text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600",
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
