import { useTranslations } from "next-intl";
import { localized } from "@/i18n/localized";
import { Link } from "@/i18n/navigation";
import RelatedCollectionCard from "@/components/collection/RelatedCollectionCard";
import WhenMountHas from "@/components/mount/WhenMountHas";
import type { LensCollection } from "@/lib/collections";
import type { Lens } from "@/lib/types";
import { collectionPath, collectionsPath } from "@/lib/url/routes";
import { HorizontalScrollRail } from "@/components/ui/horizontal-scroll-rail";
import { CHIP_BASE_CLS, CHIP_IDLE_CLS, PAGE_GUTTER_CLS, PAGE_SECTION_HEADING_CLS, SECTION_HEADING_ROW_CLS, SECTION_VIEW_ALL_LINK_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export interface FeaturedCollection {
  collection: LensCollection;
  previewLens: Pick<Lens, "id" | "mount">;
  statsLabel: string;
}

/** Featured collections on the home page: a row of chips on phones, cards from sm up. */
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
    <WhenMountHas section="collections">
      <section className={`mx-auto w-full max-w-6xl ${PAGE_GUTTER_CLS}`}>
        <div className={cn(SECTION_HEADING_ROW_CLS, "mb-4 sm:mb-5")}>
          <h2 className={PAGE_SECTION_HEADING_CLS}>{tNav("collections")}</h2>
          <Link href={collectionsPath(mount)} className={SECTION_VIEW_ALL_LINK_CLS}>
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
        <ul className="grid auto-rows-fr grid-cols-2 gap-3 max-sm:hidden lg:grid-cols-4">
          {featured.map(({ collection, previewLens, statsLabel }) => (
            <li key={collection.slug} className="grid">
              <RelatedCollectionCard collection={collection} previewLens={previewLens} locale={locale} statsLabel={statsLabel} density="compact" />
            </li>
          ))}
        </ul>
      </section>
    </WhenMountHas>
  );
}
