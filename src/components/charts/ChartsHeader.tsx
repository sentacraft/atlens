import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DEFAULT_LINEUP_BRAND } from "@/lib/charts/lineup";
import { chartPath, lineupPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { chart: "timeline", key: "tabTimeline", href: (mount: Mount) => chartPath(mount, "timeline") },
  { chart: "weight", key: "tabWeight", href: (mount: Mount) => chartPath(mount, "weight") },
  { chart: "lineup", key: "tabLineup", href: (mount: Mount) => lineupPath(mount, DEFAULT_LINEUP_BRAND) },
] as const;

export default async function ChartsHeader({
  locale,
  mount,
  active,
  title,
  description,
  children,
}: {
  locale: string;
  mount: Mount;
  active: (typeof TABS)[number]["chart"];
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  return (
    <header className="mb-6 flex flex-col gap-5">
      <nav aria-label={t("tabsLabel")} className="flex gap-6 overflow-x-auto whitespace-nowrap border-b border-zinc-200 [scrollbar-width:none]">
        {TABS.map(({ chart, key, href }) => (
          <Link
            key={chart}
            href={href(mount)}
            aria-current={chart === active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 py-2.5 text-sm transition-colors",
              chart === active ? "border-zinc-900 font-semibold text-zinc-900" : "border-transparent font-medium text-zinc-500 hover:text-zinc-900",
            )}
          >
            {t(key)}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
        <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
        {children}
      </div>
    </header>
  );
}
