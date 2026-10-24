import { Link } from "@/i18n/navigation";
import { localized } from "@/i18n/localized";
import type { LensCollection } from "@/lib/collections";
import type { Mount } from "@/lib/types";
import { collectionPath, collectionsPath } from "@/lib/url/routes";
import { PAGE_SECTION_CLS, SECTION_HEADING_CLS, SECTION_VIEW_ALL_LINK_CLS } from "@/config/ui-tokens";

interface CollectionPillsProps {
  collections: LensCollection[];
  // Passed in: counting needs the catalogue, and one caller is a client component.
  lensCounts: Record<string, number>;
  mount: Mount;
  locale: string;
  title: string;
  viewAllLabel: string;
}

export default function CollectionPills({
  collections,
  lensCounts,
  mount,
  locale,
  title,
  viewAllLabel,
}: CollectionPillsProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <section className={PAGE_SECTION_CLS}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className={SECTION_HEADING_CLS}>
          {title}
        </h2>
        <Link
          href={collectionsPath(mount)}
          className={SECTION_VIEW_ALL_LINK_CLS}
        >
          {viewAllLabel} →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {collections.map((c) => (
          <Link
            key={c.slug}
            href={collectionPath(mount, c.slug)}
            className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
          >
            <span className="font-normal text-zinc-900 group-hover:text-white">
              {localized(c.title, locale)}
            </span>
            <span className="text-xs text-zinc-400 group-hover:text-zinc-400">
              {lensCounts[c.slug] ?? 0}
            </span>
            <span className="text-zinc-300 group-hover:text-zinc-500" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
