import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ChartListGroup } from "@/lib/charts/list";
import { brandLabel, lensModelName } from "@/lib/lens/format";
import { lensPath } from "@/lib/url/routes";

export interface ChartLensGroup extends ChartListGroup {
  /** The group's title: a year or a brand name. */
  heading: string;
}

/**
 * A chart's lenses as a text list, folded under the chart. A native `<details>`, so the list is in
 * the server HTML for search engines and screen readers, and opens without JavaScript.
 */
export default async function ChartLensList({ locale, groups }: { locale: string; groups: ChartLensGroup[] }) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const total = groups.reduce((n, group) => n + group.lines.length, 0);
  return (
    <details className="group mt-6 rounded-lg border border-zinc-200">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-zinc-900">{t("listView")}</span>
        <span className="ml-auto text-xs text-zinc-500">{t("lensCount", { count: total })}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-zinc-100 px-4">
        {groups.map((group) => (
          <section
            key={group.key}
            className="grid gap-x-4 gap-y-1 border-b border-zinc-100 py-3 last:border-0 sm:grid-cols-[104px_minmax(0,1fr)]"
          >
            <h2 className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5">
              <span className="font-heading text-base font-semibold tabular-nums text-zinc-900">{group.heading}</span>
              <span className="text-xs font-normal text-zinc-500">{t("lensCount", { count: group.lines.length })}</span>
            </h2>
            <ul className="grid gap-x-6 gap-y-1.5 text-sm leading-6 md:grid-cols-2 xl:grid-cols-3">
              {group.lines.map(({ lens, showBrand, year }) => (
                <li key={lens.id} className="min-w-0 wrap-anywhere">
                  <Link
                    href={lensPath(lens)}
                    className="text-zinc-900 underline-offset-4 transition-colors hover:underline"
                  >
                    {showBrand ? <span className="text-xs text-zinc-500">{brandLabel(tBrand, lens.brand)} </span> : null}
                    {lensModelName(lens.series, lens.model)}
                    {year !== undefined ? <span className="text-xs text-zinc-500"> {year}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
