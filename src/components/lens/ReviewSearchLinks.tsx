import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import PlatformMark from "@/components/logos/PlatformMark";
import type { ReviewSearchChannel, ReviewSearchLink } from "@/lib/lens/review-search";
import { cn } from "@/lib/utils";

// The marks fill their square unevenly (Google's G fills it, Flickr's dots are under half as
// tall); standing alone in a tile, equal boxes look unequal, so each gets its own size.
const TILE_ICON_SIZE: Record<ReviewSearchChannel, number> = {
  bilibili: 16,
  youtube: 17,
  bing: 16,
  google: 13,
  flickr: 20,
  reddit: 14,
};

/** One lens's searches on other sites: a bordered list of rows, or one row of compact tiles. */
export default function ReviewSearchLinks({ links, layout }: { links: ReviewSearchLink[]; layout: "list" | "tiles" }) {
  const t = useTranslations("LensReviews");
  return (
    <ul
      className={cn(
        "text-sm",
        layout === "list" ? "overflow-hidden rounded-2xl border border-zinc-200" : "grid grid-cols-4 gap-1.5",
      )}
    >
      {links.map((link) => (
        <li key={link.channel} className={cn("min-w-0", layout === "list" && "border-b border-zinc-100 last:border-0")}>
          {layout === "list" ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center gap-3 px-4 py-3 text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              <PlatformMark channel={link.channel} className="shrink-0 text-black" />
              <span className="flex-1">
                {t(`channel.${link.channel}`)}
                <span className="text-zinc-500"> · {t(`kind.${link.kind}`)}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
            </a>
          ) : (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${t(`channel.${link.channel}`)} · ${t(`kind.${link.kind}`)}`}
              aria-label={`${t(`channel.${link.channel}`)} · ${t(`kind.${link.kind}`)}`}
              className="flex min-h-13 flex-col items-center justify-center gap-1 rounded-[10px] bg-zinc-50 px-0.5 py-1.5 text-center text-xs leading-tight text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 max-sm:min-h-14"
            >
              <span className="grid h-5 place-items-center" aria-hidden="true">
                <PlatformMark channel={link.channel} size={TILE_ICON_SIZE[link.channel]} className="text-black" />
              </span>
              <span className="max-w-full truncate">{t(`channel.${link.channel}`)}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
