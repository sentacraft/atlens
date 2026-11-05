import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ChartLens } from "@/lib/charts/catalog";
import { brandLabel, lensDisplayName } from "@/lib/lens/format";
import { lensPath } from "@/lib/url/routes";

export interface ChartLensGroup {
  key: string;
  /** A year or a brand: what the chart groups by. */
  heading: string;
  lenses: ChartLens[];
}

/**
 * A chart's lenses as a text list, folded under the chart. A native `<details>`, so the list is in
 * the server HTML for search engines and screen readers, and opens without JavaScript.
 */
export default async function ChartLensList({ locale, groups }: { locale: string; groups: ChartLensGroup[] }) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const total = groups.reduce((n, group) => n + group.lenses.length, 0);
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
              <span className="text-xs font-normal text-zinc-500">{t("lensCount", { count: group.lenses.length })}</span>
            </h2>
            <ul className="text-sm leading-6 sm:leading-7">
              {group.lenses.map((lens, i) => (
                <li key={lens.id} className="sm:inline">
                  <Link
                    href={lensPath(lens)}
                    className="text-zinc-700 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline"
                  >
                    {lensDisplayName(brandLabel(tBrand, lens.brand), lens.series, lens.model)}
                  </Link>
                  {/* The no-break space keeps the dot on the line of the name before it. */}
                  {i < group.lenses.length - 1 && (
                    <span aria-hidden className="text-zinc-400 max-sm:hidden">
                      {" · "}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
