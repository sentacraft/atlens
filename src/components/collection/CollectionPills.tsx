import { Link } from "@/i18n/navigation";
import { getCollectionStats, type LensCollection } from "@/lib/collections";

interface CollectionPillsProps {
  collections: LensCollection[];
  mountSegment: string;
  locale: string;
  title: string;
  viewAllLabel: string;
}

export default function CollectionPills({
  collections,
  mountSegment,
  locale,
  title,
  viewAllLabel,
}: CollectionPillsProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <Link
          href={`/lenses/${mountSegment}/collections`}
          className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {viewAllLabel} →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {collections.map((c) => (
          <Link
            key={c.slug}
            href={`/lenses/${mountSegment}/collections/${c.slug}`}
            className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
          >
            <span className="font-normal text-zinc-900 group-hover:text-white dark:text-zinc-100 dark:group-hover:text-zinc-900">
              {locale === "zh" ? c.title.zh : c.title.en}
            </span>
            <span className="text-xs text-zinc-400 group-hover:text-zinc-400 dark:text-zinc-500 dark:group-hover:text-zinc-500">
              {getCollectionStats(c.slug, locale)?.lensCount ?? 0}
            </span>
            <span className="text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
