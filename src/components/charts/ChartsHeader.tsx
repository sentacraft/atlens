import { getTranslations } from "next-intl/server";
import { chartPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";
import SectionTabs from "@/components/nav/SectionTabs";
import ScopeNote from "@/components/charts/ScopeNote";
import { DataSourcePill } from "@/components/lens/DataSource";

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
}: {
  locale: string;
  mount: Mount;
  active: (typeof TABS)[number]["chart"];
  title: string;
  description: string;
  /** What the chart leaves out, shown as a footnote under the description. */
  note: React.ReactNode;
  /** The page's share button, at the right end of the tab row. */
  action: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  return (
    <header className="mb-6 flex flex-col gap-5">
      <SectionTabs
        label={t("tabsLabel")}
        tabs={TABS.map(({ chart, key, href }) => ({ key: chart, label: t(key), href: href(mount) }))}
        active={active}
        action={action}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
        <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
        <DataSourcePill />
        <ScopeNote>{note}</ScopeNote>
      </div>
    </header>
  );
}
