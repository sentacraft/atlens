import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens-image";
import type { Lens } from "@/lib/types";
import type { LensCollection } from "@/lib/collections";

interface Props {
  collection: LensCollection;
  categoryTag: string;
  previewLens: Lens;
  lensCount: number;
  brandCount: number;
  locale: string;
  statsLabel: string;
}

export default function RelatedCollectionCard({
  collection,
  categoryTag,
  previewLens,
  lensCount,
  brandCount,
  locale,
  statsLabel,
}: Props) {
  const title = locale === "zh" ? collection.title.zh : collection.title.en;

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="flex h-[88px] items-stretch overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
    >
      <div className="relative w-16 shrink-0 border-r border-zinc-100 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-900/40">
        <Image
          src={getLensImageUrl(previewLens.id)}
          alt=""
          fill
          sizes="80px"
          style={lensImageStyle}
          className="object-contain p-2"
          aria-hidden="true"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          {categoryTag}
        </p>
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          {statsLabel}
        </p>
      </div>
    </Link>
  );
}
