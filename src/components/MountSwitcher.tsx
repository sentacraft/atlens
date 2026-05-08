"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useMountParam, useEffectiveMount } from "@/hooks/useMountParam";
import { useMountPreference } from "@/context/MountPreferenceProvider";
import { mountToUrlSegment } from "@/lib/mount";
import type { Mount } from "@/lib/types";


export default function MountSwitcher() {
  const t = useTranslations("MountSwitcher");
  const router = useRouter();
  const urlMount = useMountParam();
  const effectiveMount = useEffectiveMount();
  const { setPreference } = useMountPreference();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync URL mount → preference so navigating to /lenses/gfx
  // keeps the badge on GFX after navigating away.
  useEffect(() => {
    if (urlMount) setPreference(urlMount);
  }, [urlMount, setPreference]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleSelect = (mount: Mount) => {
    setPreference(mount);
    setOpen(false);
    if (urlMount !== null) {
      router.push(`/lenses/${mountToUrlSegment(mount)}`);
    }
  };

  const options: { mount: Mount; label: string }[] = [
    { mount: "X", label: t("x") },
    { mount: "G", label: t("gfx") },
  ];

  const fullLabel = effectiveMount === "X" ? t("x") : t("gfx");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-0.5 font-heading font-medium text-base text-zinc-600 dark:text-zinc-400 tracking-tight hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 px-1.5 py-0.5 -ml-1.5 rounded-md transition-all whitespace-nowrap"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
      >
        {fullLabel}
        <ChevronDown className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[8.5rem] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg shadow-zinc-950/10 py-1 overflow-hidden"
        >
          {options.map((opt) => (
            <button
              key={opt.mount}
              type="button"
              role="option"
              aria-selected={opt.mount === effectiveMount}
              onClick={() => handleSelect(opt.mount)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                opt.mount === effectiveMount
                  ? "text-zinc-900 dark:text-zinc-50 font-medium bg-zinc-50 dark:bg-zinc-900"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              {opt.label}
              {opt.mount === effectiveMount && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
