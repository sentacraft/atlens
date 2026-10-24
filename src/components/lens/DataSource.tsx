"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FieldNotePopover } from "@/components/ui/field-note-popover";
import { TEXT_LINK_CLS } from "@/config/ui-tokens";
import { aboutPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

function DataSourcePopover() {
  const t = useTranslations("DataSource");
  return (
    <FieldNotePopover
      note={t.rich("note", {
        link: (chunks) => (
          <Link href={aboutPath("data-accuracy")} className={TEXT_LINK_CLS}>
            {chunks}
          </Link>
        ),
      })}
    />
  );
}

export function DataSourceBar({ source, className }: { source: ReactNode; className?: string }) {
  const t = useTranslations("DataSource");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-xs text-zinc-600",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {t("label")}
        {source}
      </span>
      <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
        <BadgeCheck className="size-4 shrink-0 text-zinc-900" aria-hidden="true" />
        {t("trust")}
        <DataSourcePopover />
      </span>
    </div>
  );
}

/** The data-source note as a small pill under a page's subtitle, its own line so it does not read as body text. */
export function DataSourcePill({ className }: { className?: string }) {
  const t = useTranslations("DataSource");
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 self-start rounded-full bg-zinc-100 px-2.5 text-[11px] text-zinc-600", className)}>
      <BadgeCheck className="size-3.5 shrink-0 text-zinc-900" aria-hidden="true" />
      {t("inline")}
      <DataSourcePopover />
    </span>
  );
}
