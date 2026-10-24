import { useTranslations } from "next-intl";
import { localized } from "@/i18n/localized";
import { Link } from "@/i18n/navigation";
import RelatedCollectionCard from "@/components/collection/RelatedCollectionCard";
import WhenMountHasCollections from "@/components/mount/WhenMountHasCollections";
import type { LensCollection } from "@/lib/collections";
import type { Lens } from "@/lib/types";
import { collectionPath, collectionsPath } from "@/lib/url/routes";
import { HorizontalScrollRail } from "@/components/ui/horizontal-scroll-rail";
import { CHIP_BASE_CLS, CHIP_IDLE_CLS, PAGE_GUTTER_CLS } from "@/config/ui-tokens";

export interface FeaturedCollection {
  collection: LensCollection;
  previewLens: Pick<Lens, "id" | "mount">;
  statsLabel: string;
}

/**
 * Featured collections along the bottom of the home hero: a row of chips on phones, with the link
 * to all of them in the heading; cards from sm up, four on desktop widths.
 */
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
  const mount = featured[0].previewLens.mount;

  return (
    <WhenMountHasCollections>
      <section className={`mx-auto w-full max-w-6xl ${PAGE_GUTTER_CLS}`}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold text-zinc-600">{tNav("collections")}</h2>
          <Link
            href={collectionsPath(mount)}
            className="text-[13px] font-medium text-zinc-900 underline-offset-4 hover:underline sm:hidden"
          >
            {t("allCollections", { count: total })} →
          </Link>
        </div>
        <HorizontalScrollRail
          className="gap-2 px-5 py-0.5"
          wrapperClassName="-mx-5 sm:hidden"
          fadeBg="from-white"
        >
          {featured.map(({ collection }) => (
            <Link
              key={collection.slug}
              href={collectionPath(mount, collection.slug)}
              className={`${CHIP_BASE_CLS} ${CHIP_IDLE_CLS} px-3.5 py-2 text-[13px]`}
            >
              {localized(collection.title, locale)}
            </Link>
          ))}
        </HorizontalScrollRail>
        <ul className="grid auto-rows-fr grid-cols-2 gap-2 max-sm:hidden sm:gap-3 lg:grid-cols-5">
          {featured.map(({ collection, previewLens, statsLabel }, index) => (
            <li key={collection.slug} className={index === 3 ? "hidden lg:grid" : "grid"}>
              <RelatedCollectionCard collection={collection} previewLens={previewLens} locale={locale} statsLabel={statsLabel} density="compact" />
            </li>
          ))}
          <li className="grid">
            <Link
              href={collectionsPath(mount)}
              className="flex h-full min-h-[88px] items-center justify-center rounded-2xl max-sm:min-h-0 max-sm:rounded-xl max-sm:py-2 max-sm:text-[13px] border border-zinc-200 bg-zinc-50 px-3 text-center text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {t("allCollections", { count: total })} →
            </Link>
          </li>
        </ul>
      </section>
    </WhenMountHasCollections>
  );
}
