import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "@/components/ui/external-link";
import xLensesRaw from "@/data/lenses.json";
import gLensesRaw from "@/data/lenses-g.json";
import coverageMeta from "@/data/coverage-meta.json";

type LensEntry = { brand: string };

const xLenses = xLensesRaw as LensEntry[];
const gLenses = gLensesRaw as LensEntry[];

function countByBrand(lenses: LensEntry[]): Record<string, number> {
  return lenses.reduce<Record<string, number>>((acc, l) => {
    acc[l.brand] = (acc[l.brand] ?? 0) + 1;
    return acc;
  }, {});
}

const BRAND_ORDER_X = [
  "fujifilm",
  "sigma",
  "tamron",
  "viltrox",
  "7artisans",
  "ttartisan",
  "brightinstar",
  "sgimage",
];

const BRAND_ORDER_G = ["fujifilm"];

interface CoverageTableProps {
  title: string;
  brandOrder: string[];
  counts: Record<string, number>;
  notes: Record<string, string>;
  brandNames: Record<string, string>;
  colBrand: string;
  colCount: string;
  colNotes: string;
  rowTotal: string;
}

function CoverageTable({
  title,
  brandOrder,
  counts,
  notes,
  brandNames,
  colBrand,
  colCount,
  colNotes,
  rowTotal,
}: CoverageTableProps) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 w-36">
                {colBrand}
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 w-20">
                {colCount}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {colNotes}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {brandOrder.map((brand) => (
              <tr key={brand}>
                <td className="px-4 py-2.5 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                  {brandNames[brand] ?? brand}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {counts[brand] ?? 0}
                </td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 text-xs">
                  {notes[brand] || ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <td className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {rowTotal}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {total}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default async function CoverageContent() {
  const [t, tBrand] = await Promise.all([
    getTranslations("Coverage"),
    getTranslations("Brands"),
  ]);

  const xCounts = countByBrand(xLenses);
  const gCounts = countByBrand(gLenses);

  const brandNames = Object.fromEntries(
    [...BRAND_ORDER_X, ...BRAND_ORDER_G].map((b) => [
      b,
      tBrand(b as Parameters<typeof tBrand>[0]),
    ])
  );

  const xNotes = coverageMeta.x as Record<string, string>;
  const gNotes = coverageMeta.g as Record<string, string>;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-12 pb-12 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/about"
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors self-start"
        >
          {t("backToAbout")}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-heading">
          {t("pageTitle")}
        </h1>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed -mt-4">
        {t("intro")}
      </p>

      <CoverageTable
        title={t("xMountTitle")}
        brandOrder={BRAND_ORDER_X}
        counts={xCounts}
        notes={xNotes}
        brandNames={brandNames}
        colBrand={t("colBrand")}
        colCount={t("colCount")}
        colNotes={t("colNotes")}
        rowTotal={t("rowTotal")}
      />

      <CoverageTable
        title={t("gMountTitle")}
        brandOrder={BRAND_ORDER_G}
        counts={gCounts}
        notes={gNotes}
        brandNames={brandNames}
        colBrand={t("colBrand")}
        colCount={t("colCount")}
        colNotes={t("colNotes")}
        rowTotal={t("rowTotal")}
      />

      <ExternalLink
        href="https://github.com/sentacraft/x-glass"
        className="self-start text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        {t("githubCta")}
      </ExternalLink>
    </div>
  );
}
