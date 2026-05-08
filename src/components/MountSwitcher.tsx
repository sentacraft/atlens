"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import { useMountParam } from "@/hooks/useMountParam";
import type { Mount } from "@/lib/types";

const MOUNT_LABEL: Record<Mount, string> = { X: "X", G: "GFX" };

export default function MountSwitcher() {
  const t = useTranslations("MountSwitcher");
  const mount = useMountParam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const effectiveMount = mount ?? "X";

  const options: { mount: Mount; label: string; href: string }[] = [
    { mount: "X", label: t("x"), href: "/lenses/x" },
    { mount: "G", label: t("gfx"), href: "/lenses/gfx" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {MOUNT_LABEL[effectiveMount]}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[7rem] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg shadow-zinc-950/10 py-1 overflow-hidden"
        >
          {options.map((opt) => (
            <Link
              key={opt.mount}
              href={opt.href}
              role="option"
              aria-selected={opt.mount === effectiveMount}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                opt.mount === effectiveMount
                  ? "text-zinc-900 dark:text-zinc-50 font-medium bg-zinc-50 dark:bg-zinc-900"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              {opt.label}
              {opt.mount === mount && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
