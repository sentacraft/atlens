import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { chartPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";
import ScopeNote from "@/components/charts/ScopeNote";

const TABS = [
  { chart: "timeline", key: "tabTimeline", href: (mount: Mount) => chartPath(mount, "timeline") },
  { chart: "weight", key: "tabWeight", href: (mount: Mount) => chartPath(mount, "weight") },
  { chart: "lineups", key: "tabLineup", href: (mount: Mount) => chartPath(mount, "lineups") },
] as const;

export default async function ChartsHeader({
  locale,
  mount,
  active,
  title,
  description,
  note,
  action,
  children,
}: {
  locale: string;
  mount: Mount;
  active: (typeof TABS)[number]["chart"];
  title: string;
  description: string;
  /** What the chart leaves out, shown as a footnote under the description. */
  note: string;
  /** The page's share button, at the right end of the tab row. */
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  return (
    <header className="mb-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200">
        <nav aria-label={t("tabsLabel")} className="-mb-px flex min-w-0 gap-6 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
          {TABS.map(({ chart, key, href }) => (
            <Link
              key={chart}
              href={href(mount)}
              aria-current={chart === active ? "page" : undefined}
              className={cn(
                "border-b-2 py-2.5 text-sm transition-colors",
                chart === active ? "border-zinc-900 font-semibold text-zinc-900" : "border-transparent font-medium text-zinc-500 hover:text-zinc-900",
              )}
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="shrink-0">{action}</div>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
        <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
        <ScopeNote>{note}</ScopeNote>
        {children}
      </div>
    </header>
  );
}
