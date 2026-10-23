import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Lineup } from "@/lib/charts/lineup";
import { brandLabel, focalRangeDisplay } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { brandPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";

/** Every brand's lineup side by side, wide to long; each links to the brand page with the full chart. */
export default async function BrandLineupsOverview({ locale, mount, lineups }: { locale: string; mount: Mount; lineups: Lineup[] }) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  const tBrandPage = await getTranslations({ locale, namespace: "Brand" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });

  return (
    <ul className="flex flex-col gap-3">
      {lineups.map((lineup) => {
        const lenses = [...lineup.primes.flatMap((column) => [...column.lenses].reverse()), ...lineup.zooms].sort(
          (a, b) => a.focalMin - b.focalMin || a.focalMax - b.focalMax,
        );
        return (
          <li key={lineup.brand}>
            <Link
              href={brandPath(mount, lineup.brand)}
              className="group flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 transition-colors hover:border-zinc-900"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-heading text-lg font-bold text-zinc-900">{brandLabel(tBrand, lineup.brand)}</span>
                  <span className="text-xs text-zinc-600">
                    {tBrandPage("summary", {
                      count: lineup.count,
                      primes: lineup.primes.reduce((n, column) => n + column.lenses.length, 0),
                      zooms: lineup.zooms.length,
                      focal: focalRangeDisplay(lineup.focalMin, lineup.focalMax),
                    })}
                  </span>
                </span>
                <span className="text-sm text-zinc-600 group-hover:text-zinc-900">{t("lineupsCta")}</span>
              </span>
              <span className="flex flex-wrap gap-1" aria-hidden="true">
                {lenses.map((lens) => (
                  <Image key={lens.id} src={getLensImageUrl(lens.id)} alt="" width={40} height={40} className="size-9 object-contain md:size-10" />
                ))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
