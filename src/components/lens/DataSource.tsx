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

export function DataSourceInline({ className }: { className?: string }) {
  const t = useTranslations("DataSource");
  const text = t("inline");
  const split = text.lastIndexOf(" ") + 1;
  const head = text.slice(0, split);
  const tail = text.slice(split);

  return (
    <span className={cn("text-xs text-zinc-500", className)}>
      <BadgeCheck className="mr-1 inline size-3.5 -mt-0.5 text-zinc-900" aria-hidden="true" />
      {head}
      {/* The last word rides with the info icon; otherwise the icon wraps onto a line of its own on phones. */}
      <span className="whitespace-nowrap">
        {tail}
        <span className="ml-1 inline-flex align-middle -mt-0.5">
          <DataSourcePopover />
        </span>
      </span>
    </span>
  );
}
