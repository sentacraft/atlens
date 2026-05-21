"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { useRouter } from "@/i18n/navigation";
import { useMountParam, useEffectiveMount } from "@/hooks/useMountParam";
import { useMountPreference } from "@/context/MountPreferenceProvider";
import { mountToUrlSegment } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import { track } from "@/lib/analytics";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";

export default function MountSwitcher() {
  const t = useTranslations("MountSwitcher");
  const router = useRouter();
  const urlMount = useMountParam();
  const effectiveMount = useEffectiveMount();
  const { setPreference } = useMountPreference();

  // Sync URL mount → preference so navigating to /lenses/gfx
  // keeps the badge on GFX after navigating away.
  useEffect(() => {
    if (urlMount) {
      setPreference(urlMount);
    }
  }, [urlMount, setPreference]);

  const options: { value: Mount; label: string }[] = [
    { value: "X", label: t("x") },
    { value: "G", label: t("gfx") },
  ];

  const handleValueChange = (value: Mount | null) => {
    if (value === null) {
      return;
    }
    if (value !== effectiveMount) {
      track("mount_switch", { from_mount: effectiveMount, to_mount: value });
    }
    setPreference(value);
    if (urlMount !== null) {
      router.push(`/lenses/${mountToUrlSegment(value)}`);
    }
  };

  return (
    <Select
      items={options}
      value={effectiveMount}
      onValueChange={handleValueChange}
    >
      <SelectPrimitive.Trigger
        aria-label={t("label")}
        className="group flex items-center gap-0.5 -ml-1 sm:-ml-1.5 px-1 py-0.5 sm:px-1.5 rounded-md font-heading font-medium text-sm sm:text-base tracking-tight whitespace-nowrap text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all outline-none"
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon
          render={
            <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          }
        />
      </SelectPrimitive.Trigger>
      <SelectContent
        align="start"
        className="w-auto min-w-[8.5rem] overflow-hidden"
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="rounded-none py-2 sm:py-2 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 data-[selected]:text-zinc-900 dark:data-[selected]:text-zinc-50"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
