import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import { getAllLenses } from "@/lib/lens/data";
import { mountToUrlSegment } from "@/lib/mount";
import type { Lens } from "@/lib/types";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "RecentlyAdded" });
  const title = t("pageTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    openGraph: {
      title: `${title} | Atlens`,
      description,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, "recently-added"),
  };
}

// Date-only strings are formatted in UTC so the rendered day matches the stored
// createdAt regardless of the server's timezone.
function formatDay(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

const byBrandThenModel = (a: Lens, b: Lens) =>
  a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);

export default async function RecentlyAddedPage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tBrand] = await Promise.all([
    getTranslations({ locale, namespace: "RecentlyAdded" }),
    getTranslations({ locale, namespace: "Brands" }),
  ]);

  // Group every lens by its createdAt day. The earliest day is the launch seed
  // (the library's initial bulk import, backfilled from git history) — it is
  // rendered as a single collapsed line rather than an enumerated batch, since
  // it represents the starting catalog rather than a real daily addition.
  const byDate = new Map<string, Lens[]>();
  for (const lens of getAllLenses(locale)) {
    if (!lens.createdAt) {
      continue;
    }
    const group = byDate.get(lens.createdAt) ?? [];
    group.push(lens);
    byDate.set(lens.createdAt, group);
  }

  const sortedDates = [...byDate.keys()].sort();
  const seedDate = sortedDates[0];
  const entryDates = sortedDates.slice(1).reverse();

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-12 pb-32 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-heading">
        {t("pageTitle")}
      </h1>
      <p className="-mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        {t("intro")}
      </p>

      <div className="flex flex-col gap-8">
        {entryDates.map((date) => {
          const lenses = byDate.get(date) ?? [];
          const mountGroups = [
            { key: "X", label: t("mountX"), lenses: lenses.filter((l) => l.mount === "X").sort(byBrandThenModel) },
            { key: "G", label: t("mountG"), lenses: lenses.filter((l) => l.mount === "G").sort(byBrandThenModel) },
          ].filter((g) => g.lenses.length > 0);

          return (
            <section key={date} className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatDay(date, locale)}
                </h2>
                <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                  {t("added", { count: lenses.length })}
                </span>
              </div>

              {mountGroups.map((group) => (
                <div key={group.key} className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {group.lenses.map((lens) => (
                      <li key={lens.id}>
                        <Link
                          href={`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`}
                          className="group inline-flex items-baseline gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                        >
                          <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500">
                            ·
                          </span>
                          <span>
                            {tBrand(lens.brand as Parameters<typeof tBrand>[0])} {lens.model}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          );
        })}

        {seedDate ? (
          <div className="flex items-baseline justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-sm text-zinc-500 dark:text-zinc-500">
            <span>
              {formatDay(seedDate, locale)} · {t("initialLibraryLabel")}
            </span>
            <span className="shrink-0 tabular-nums">
              {t("lensesCount", { count: byDate.get(seedDate)?.length ?? 0 })}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
