import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import TimelineChart from "@/components/charts/TimelineChart";
import { ANCHORED_SECTION_CLS, SECTION_HEADING_ROW_CLS, PAGE_SECTION_HEADING_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import type { TimelineEntry, TimelineYear } from "@/lib/charts/timeline";
import { cn } from "@/lib/utils";

/**
 * A page section with the release timeline of some of the lenses (a brand's, a series'), ending
 * in a link to the full timeline. `total` is how many lenses the page lists, dated or not.
 */
export default function TimelineSection({
  entries,
  years,
  total,
  fullHref,
  action,
  className,
}: {
  entries: TimelineEntry[];
  years: TimelineYear[];
  total: number;
  fullHref: string;
  action?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("Charts");
  const span = { first: String(years[0]?.year ?? ""), last: String(years.at(-1)?.year ?? "") };
  return (
    <section id="timeline" className={cn(ANCHORED_SECTION_CLS, className)} aria-labelledby="timeline-heading">
      <div className={SECTION_HEADING_ROW_CLS}>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 id="timeline-heading" className={PAGE_SECTION_HEADING_CLS}>
            {t("timelineHeading")}
          </h2>
          <span className="text-sm text-zinc-500">
            {entries.length === total
              ? t("timelineSpan", { ...span, count: entries.length })
              : t("timelineSpanPartial", { ...span, count: entries.length, total })}
          </span>
        </div>
        {action}
      </div>
      <TimelineChart mode={{ kind: "section" }} entries={entries} years={years} />
      <Link href={fullHref} className={cn(TEXT_LINK_CLS, "self-start text-sm")}>
        {t("seeFullTimeline")}
      </Link>
    </section>
  );
}
