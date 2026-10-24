import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { localized } from "@/i18n/localized";
import { Link } from "@/i18n/navigation";
import RelatedCollectionCard from "@/components/collection/RelatedCollectionCard";
import { SECTION_HEADING_CLS, SECTION_VIEW_ALL_LINK_CLS } from "@/config/ui-tokens";
import type { CollectionSummary } from "@/lib/collection-stats";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { Mount } from "@/lib/types";
import { collectionPath, collectionsPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

/** Links to collections under a heading: a compact list on phones, cards from sm up. */
export default function CollectionLinks({
  items,
  mount,
  locale,
  title,
  className,
}: {
  items: CollectionSummary[];
  mount: Mount;
  locale: string;
  title: string;
  className?: string;
}) {
  const t = useTranslations("Collection");
  if (items.length === 0) {
    return null;
  }
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={SECTION_HEADING_CLS}>{title}</h2>
        <Link href={collectionsPath(mount)} className={SECTION_VIEW_ALL_LINK_CLS}>
          {t("viewAllCollections")} →
        </Link>
      </div>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 sm:hidden">
        {items.map(({ collection, previewLens, lensCount }) => (
          <li key={collection.slug}>
            <Link
              href={collectionPath(previewLens.mount, collection.slug)}
              className="flex h-13 items-center gap-3 pr-3 pl-2 transition-colors active:bg-zinc-50"
            >
              <span className="relative size-9 shrink-0">
                <Image src={getLensImageUrl(previewLens.id)} alt="" fill sizes="36px" style={lensImageStyle} className="object-contain" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                {localized(collection.title, locale)}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">{t("lensCount", { count: lensCount })}</span>
              <ChevronRight className="size-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <ul className="grid gap-3 max-sm:hidden" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {items.map(({ collection, previewLens, lensCount, brandCount }) => (
          <li key={collection.slug}>
            <RelatedCollectionCard
              collection={collection}
              previewLens={previewLens}
              locale={locale}
              statsLabel={t("stats", { count: lensCount, brandCount })}
              density="comfortable"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
