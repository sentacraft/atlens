"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { ICON_NAV_BTN_CLS } from "@/config/ui-tokens";

/** A dashboard card whose info button shows what its numbers mean. */
export default function Card({
  title,
  subtitle,
  info,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  info: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const infoId = useId();
  return (
    <section className={`min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-zinc-800">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowInfo((shown) => !shown)}
          aria-expanded={showInfo}
          aria-controls={infoId}
          aria-label={`What ${title} means`}
          className={`${ICON_NAV_BTN_CLS} -mr-1.5 -mt-1.5 size-8 ${showInfo ? "bg-zinc-100 text-zinc-900" : ""}`}
        >
          <Info size={16} aria-hidden />
        </button>
      </div>
      {showInfo && (
        <div id={infoId} className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs leading-relaxed text-zinc-700">
          {info}
        </div>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}
