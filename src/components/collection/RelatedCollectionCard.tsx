import Image from "next/image";
import { localized } from "@/i18n/localized";
import { Link } from "@/i18n/navigation";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { Lens } from "@/lib/types";
import type { LensCollection } from "@/lib/collections";
import { collectionPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

interface Props {
  collection: LensCollection;
  previewLens: Lens;
  locale: string;
  statsLabel: string;
  /** compact clamps the title to two lines, for the home page's five-column grid. */
  density: "comfortable" | "compact";
}

export default function RelatedCollectionCard({
  collection,
  previewLens,
  locale,
  statsLabel,
  density,
}: Props) {
  const compact = density === "compact";
  const title = localized(collection.title, locale);

  return (
    <Link
      href={collectionPath(previewLens.mount, collection.slug)}
      className="flex min-h-[88px] items-stretch overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:bg-zinc-50"
    >
      <div className="relative w-16 shrink-0 border-r border-zinc-100 bg-zinc-50/40">
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
        <h3
          className={cn(
            "text-sm font-semibold leading-snug text-zinc-900",
            compact && "line-clamp-2",
          )}
        >
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {statsLabel}
        </p>
      </div>
    </Link>
  );
}
