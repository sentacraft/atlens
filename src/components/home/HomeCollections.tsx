import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RelatedCollectionCard from "@/components/collection/RelatedCollectionCard";
import WhenMountHasCollections from "@/components/mount/WhenMountHasCollections";
import type { LensCollection } from "@/lib/collections";
import type { Lens } from "@/lib/types";
import { collectionsPath } from "@/lib/url/routes";

export interface FeaturedCollection {
  collection: LensCollection;
  previewLens: Lens;
  statsLabel: string;
}

/** Featured collections along the bottom of the home hero: four on wide screens, three on phones. */
export default function HomeCollections({
  featured,
  total,
  locale,
}: {
  featured: FeaturedCollection[];
  total: number;
  locale: string;
}) {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");
  if (featured.length === 0) {
    return null;
  }

  return (
    <WhenMountHasCollections>
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{tNav("collections")}</h2>
          <p className="hidden text-[11px] text-zinc-400 sm:block dark:text-zinc-500">{t("collectionsIntro")}</p>
        </div>
        <ul className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          {featured.map(({ collection, previewLens, statsLabel }, index) => (
            <li key={collection.slug} className={index === 3 ? "hidden sm:grid" : "grid"}>
              <RelatedCollectionCard collection={collection} previewLens={previewLens} locale={locale} statsLabel={statsLabel} density="compact" />
            </li>
          ))}
          <li className="grid">
            <Link
              href={collectionsPath(featured[0].previewLens.mount)}
              className="flex h-full min-h-[88px] items-center justify-center rounded-2xl max-sm:min-h-0 max-sm:rounded-xl max-sm:py-2 max-sm:text-[13px] border border-zinc-200 bg-zinc-50 px-3 text-center text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {t("allCollections", { count: total })} →
            </Link>
          </li>
        </ul>
      </section>
    </WhenMountHasCollections>
  );
}
