"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FileCheck } from "lucide-react";
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

/** Full-width bar at the top of a spec table: where the specs come from, and that they are not AI-generated. */
export function DataSourceBar({ source, className }: { source: ReactNode; className?: string }) {
  const t = useTranslations("DataSource");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <FileCheck className="size-3.5 shrink-0" aria-hidden="true" />
        {t("label")}
        {source}
      </span>
      <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
        {t("trust")}
        <DataSourcePopover />
      </span>
    </div>
  );
}

/** One-phrase version for a page's count or stats line. */
export function DataSourceInline({ className }: { className?: string }) {
  const t = useTranslations("DataSource");

  return (
    <span className={cn("text-xs text-zinc-500 dark:text-zinc-400", className)}>
      <FileCheck className="mr-1 inline size-3.5 -mt-0.5" aria-hidden="true" />
      {t("inline")}{" "}
      <span className="inline-flex align-middle -mt-0.5">
        <DataSourcePopover />
      </span>
    </span>
  );
}
