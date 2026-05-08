"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMountParam, useEffectiveMount } from "@/hooks/useMountParam";
import { useMountPreference } from "@/context/MountPreferenceProvider";
import { mountToUrlSegment } from "@/lib/mount";
import type { Mount } from "@/lib/types";

export default function HeroBrand() {
  const t = useTranslations("MountSwitcher");
  const router = useRouter();
  const urlMount = useMountParam();
  const mount = useEffectiveMount();
  const { setPreference } = useMountPreference();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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

  const handleSelect = (m: Mount) => {
    setPreference(m);
    setOpen(false);
    if (urlMount !== null) {
      router.push(`/lenses/${mountToUrlSegment(m)}`);
    }
  };

  const options: { mount: Mount; label: string }[] = [
    { mount: "X", label: t("x") },
    { mount: "G", label: t("gfx") },
  ];

  if (mount !== "G") {
    return <span>X-Glass</span>;
  }

  return (
    <span>
      X-Glass
      <span className="font-light text-zinc-300 dark:text-zinc-600"> /</span>
      {/* Inline scope selector — valid phrasing content inside <h1> */}
      <span ref={ref} className="relative inline-block">
        <button
          onClick={() => setOpen((v) => !v)}
          className="group inline-flex items-center gap-1.5 font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t("label")}
        >
          {" GFX"}
          <ChevronDown className="h-5 w-5 opacity-20 group-hover:opacity-60 transition-opacity" />
        </button>

        {open && (
          // Reset font — this span inherits text-5xl/font-bold from <h1>
          <span
            role="listbox"
            className="absolute left-0 top-full mt-2 z-50 block min-w-[9rem] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg shadow-zinc-950/10 py-1 overflow-hidden text-sm font-normal tracking-normal font-sans"
          >
            {options.map((opt) => (
              <button
                key={opt.mount}
                type="button"
                role="option"
                aria-selected={opt.mount === mount}
                onClick={() => handleSelect(opt.mount)}
                className={`flex w-full items-center gap-2 px-3 py-2 transition-colors text-left ${
                  opt.mount === mount
                    ? "text-zinc-900 dark:text-zinc-50 font-medium bg-zinc-50 dark:bg-zinc-900"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                {opt.label}
                {opt.mount === mount && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />
                )}
              </button>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
